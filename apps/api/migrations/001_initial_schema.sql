-- ============================================================
-- Form Builder - Initial Schema
-- Run order: 001
-- ============================================================

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Users (internal SSO accounts) ──────────────────────────
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    name          VARCHAR(255),
    avatar_url    TEXT,
    provider      VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'microsoft')),
    provider_id   VARCHAR(255) NOT NULL,
    org_provider  VARCHAR(20) NOT NULL CHECK (org_provider IN ('google', 'microsoft')),
    role          VARCHAR(20) NOT NULL DEFAULT 'editor' CHECK (role IN ('admin', 'editor', 'viewer')),
    refresh_token TEXT,
    access_token  TEXT,
    token_expiry  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_id)
);

-- ─── Forms ───────────────────────────────────────────────────
CREATE TABLE forms (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    status         VARCHAR(20) NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'published', 'archived', 'closed')),
    created_by     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    response_count INTEGER NOT NULL DEFAULT 0,

    -- JSON blobs for flexibility (schema evolves over time)
    settings       JSONB NOT NULL DEFAULT '{
        "allowMultipleSubmissions": true,
        "requireLogin": false,
        "showProgressBar": false,
        "confirmationMessage": "Thank you for your response!"
    }'::jsonb,
    fields         JSONB NOT NULL DEFAULT '[]'::jsonb,
    layout         JSONB NOT NULL DEFAULT '{"type": "single-page"}'::jsonb,
    workflow       JSONB NOT NULL DEFAULT '{"id": "", "triggers": [], "actions": []}'::jsonb,
    storage_config JSONB,    -- StorageConfig (Google/MS)
    database_config JSONB    -- DatabaseConfig (Sheets/Excel)
);

CREATE INDEX idx_forms_created_by ON forms(created_by);
CREATE INDEX idx_forms_status ON forms(status);

-- ─── Shortlinks ──────────────────────────────────────────────
CREATE TABLE shortlinks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_code      VARCHAR(30) NOT NULL,
    current_form_id UUID NOT NULL REFERENCES forms(id) ON DELETE RESTRICT,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'inactive', 'archived')),
    access_type     VARCHAR(20) NOT NULL DEFAULT 'public'
                      CHECK (access_type IN ('public', 'password', 'email_list', 'token', 'rate_limited')),
    access_config   JSONB NOT NULL DEFAULT '{}'::jsonb,
    fallback_url    TEXT,
    total_clicks    INTEGER NOT NULL DEFAULT 0,
    unique_clicks   INTEGER NOT NULL DEFAULT 0,
    created_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,
    archived_at     TIMESTAMPTZ,

    CONSTRAINT short_code_format CHECK (short_code ~ '^[A-Z0-9\-_]+$')
);

-- Active shortlinks must have unique short codes
CREATE UNIQUE INDEX idx_shortlinks_code_active
    ON shortlinks(short_code)
    WHERE archived_at IS NULL;

CREATE INDEX idx_shortlinks_created_by ON shortlinks(created_by);
CREATE INDEX idx_shortlinks_form ON shortlinks(current_form_id);

-- ─── Shortlink history (full audit trail) ────────────────────
CREATE TABLE shortlink_history (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shortlink_id   UUID NOT NULL REFERENCES shortlinks(id) ON DELETE CASCADE,
    form_id        UUID NOT NULL REFERENCES forms(id) ON DELETE RESTRICT,
    activated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deactivated_at TIMESTAMPTZ,
    reason         TEXT NOT NULL DEFAULT '',
    changed_by     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_slhistory_shortlink ON shortlink_history(shortlink_id);
CREATE INDEX idx_slhistory_active    ON shortlink_history(shortlink_id)
    WHERE deactivated_at IS NULL;

-- ─── External sessions (anonymous / non-SSO access) ──────────
CREATE TABLE external_sessions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shortlink_id        UUID NOT NULL REFERENCES shortlinks(id) ON DELETE CASCADE,
    session_token       VARCHAR(64) UNIQUE NOT NULL,
    respondent_hash     VARCHAR(64),        -- hashed email if provided
    respondent_fingerprint JSONB,           -- {ipHash, userAgent, device}
    access_granted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    access_expires_at   TIMESTAMPTZ NOT NULL,
    response_started    BOOLEAN NOT NULL DEFAULT FALSE,
    response_completed  BOOLEAN NOT NULL DEFAULT FALSE,
    form_id             UUID NOT NULL REFERENCES forms(id) ON DELETE RESTRICT,
    metadata            JSONB NOT NULL DEFAULT '{}'::jsonb  -- utm, referrer, etc.
);

CREATE INDEX idx_ext_sessions_token   ON external_sessions(session_token);
CREATE INDEX idx_ext_sessions_link    ON external_sessions(shortlink_id);
CREATE INDEX idx_ext_sessions_expiry  ON external_sessions(access_expires_at)
    WHERE response_completed = FALSE;

-- ─── Click analytics ─────────────────────────────────────────
CREATE TABLE shortlink_clicks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shortlink_id UUID NOT NULL REFERENCES shortlinks(id) ON DELETE CASCADE,
    clicked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_hash      VARCHAR(64),
    user_agent   TEXT,
    referrer     TEXT,
    country      VARCHAR(2),
    device_type  VARCHAR(20) CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'bot', 'unknown')),
    is_unique    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_clicks_shortlink ON shortlink_clicks(shortlink_id);
CREATE INDEX idx_clicks_time      ON shortlink_clicks(clicked_at);

-- ─── Audit log (CRUD + submissions) ──────────────────────────
CREATE TABLE audit_log (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID REFERENCES users(id),
    actor_email VARCHAR(255),
    action      VARCHAR(100) NOT NULL,
    resource    VARCHAR(50)  NOT NULL,
    resource_id UUID,
    payload     JSONB,
    ip_hash     VARCHAR(64),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_resource ON audit_log(resource, resource_id);
CREATE INDEX idx_audit_time     ON audit_log(created_at);

-- ─── Approval requests (workflow engine) ─────────────────────
CREATE TABLE approval_requests (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id      UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    response_ref TEXT NOT NULL,  -- row ID in Sheets/Excel
    shortlink_id UUID REFERENCES shortlinks(id),
    status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    workflow_config JSONB NOT NULL,
    current_step INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at  TIMESTAMPTZ,
    resolved_by  VARCHAR(255)
);

CREATE TABLE approval_steps (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    step_order          INTEGER NOT NULL,
    approver_email      VARCHAR(255) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected', 'skipped')),
    comment             TEXT,
    decided_at          TIMESTAMPTZ,
    token               VARCHAR(64) UNIQUE  -- used in approval email links
);

CREATE INDEX idx_approval_req_form ON approval_requests(form_id);
CREATE INDEX idx_approval_steps_token ON approval_steps(token);

-- ─── Updated-at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_forms_updated_at
    BEFORE UPDATE ON forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_shortlinks_updated_at
    BEFORE UPDATE ON shortlinks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_approval_requests_updated_at
    BEFORE UPDATE ON approval_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
