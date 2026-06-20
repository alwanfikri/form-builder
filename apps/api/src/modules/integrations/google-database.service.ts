import { Injectable, Logger } from '@nestjs/common';
import { google, Auth } from 'googleapis';
import type {
  FormSchema, FormField, FormResponse,
  GoogleDatabaseConfig, QueryFilter, PaginatedResponse,
} from '@form-builder/shared';

@Injectable()
export class GoogleDatabaseService {
  private readonly logger = new Logger(GoogleDatabaseService.name);

  private getClients(accessToken: string) {
    const auth = new Auth.OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    auth.setCredentials({ access_token: accessToken });

    return {
      sheets: google.sheets({ version: 'v4', auth }),
      drive: google.drive({ version: 'v3', auth }),
    };
  }

  async createFormDatabase(
    formSchema: FormSchema,
    userAccessToken: string,
  ): Promise<GoogleDatabaseConfig> {
    const { sheets, drive } = this.getClients(userAccessToken);

    // 1. Create folder in Google Drive
    const folder = await drive.files.create({
      requestBody: {
        name: `Form: ${formSchema.name}`,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [process.env.FORMS_ROOT_FOLDER_ID!],
      },
      fields: 'id, webViewLink',
    } as any) as any;

    // 2. Create response spreadsheet with headers
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: `Responses: ${formSchema.name}` },
        sheets: [{
          properties: {
            title: 'Form Responses',
            gridProperties: { rowCount: 10000, columnCount: 50 },
          },
          data: [{
            rowData: [{ values: this.generateHeaderCells(formSchema.fields) }],
          }],
        }],
      },
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId!;

    // 3. Move to folder
    await drive.files.update({
      fileId: spreadsheetId,
      addParents: folder.data.id!,
      removeParents: 'root',
      fields: 'id, parents',
    });

    // 4. Restrict to org domain
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: {
        role: 'writer',
        type: 'domain',
        domain: process.env.COMPANY_DOMAIN,
      },
    });

    // 5. Freeze header row + bold it
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          updateSheetProperties: {
            properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
            fields: 'gridProperties.frozenRowCount',
          },
        }],
      },
    });

    return {
      provider: 'google',
      folderId: folder.data.id!,
      spreadsheetId,
      sheetName: 'Form Responses',
      webViewLink: spreadsheet.data.spreadsheetUrl!,
    };
  }

  async submitResponse(
    config: GoogleDatabaseConfig,
    response: FormResponse,
    userAccessToken: string,
  ): Promise<{ rowNumber: number; timestamp: string }> {
    const { sheets } = this.getClients(userAccessToken);
    const timestamp = new Date().toISOString();

    const values = [
      timestamp,
      response.respondentEmail || '',
      response.respondentName || '',
      ...this.flattenResponseValues(response),
    ];

    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: config.spreadsheetId,
      range: `${config.sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [values] },
    });

    const updatedRange = result.data.updates?.updatedRange || '';
    const match = updatedRange.match(/(\d+)$/);
    const rowNumber = match ? parseInt(match[1]) : 0;

    return { rowNumber, timestamp };
  }

  async queryResponses(
    config: GoogleDatabaseConfig,
    userAccessToken: string,
    filters?: QueryFilter[],
    pagination?: { page: number; limit: number },
  ): Promise<PaginatedResponse<FormResponse>> {
    const { sheets } = this.getClients(userAccessToken);

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: `${config.sheetName}!A1:AZ10000`,
    });

    const rows = result.data.values || [];
    if (rows.length <= 1) {
      return { data: [], total: 0, page: 1, totalPages: 0 };
    }

    const headers = rows[0] as string[];
    let dataRows = rows.slice(1) as string[][];

    if (filters?.length) {
      dataRows = this.applyFilters(dataRows, headers, filters);
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const start = (page - 1) * limit;
    const paginated = dataRows.slice(start, start + limit);

    return {
      data: paginated.map((row) => this.parseRowToResponse(row, headers, config)),
      total: dataRows.length,
      page,
      totalPages: Math.ceil(dataRows.length / limit),
    };
  }

  async uploadAttachment(
    folderId: string,
    file: Buffer,
    filename: string,
    mimeType: string,
    userAccessToken: string,
  ): Promise<{ fileId: string; webViewLink: string }> {
    const { drive } = this.getClients(userAccessToken);

    const response = await drive.files.create({
      requestBody: { name: filename, mimeType, parents: [folderId] },
      media: { mimeType, body: file },
      fields: 'id, webViewLink',
    });

    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: 'reader',
        type: 'domain',
        domain: process.env.COMPANY_DOMAIN,
      },
    });

    return {
      fileId: response.data.id!,
      webViewLink: response.data.webViewLink!,
    };
  }

  // ─── Private helpers ───────────────────────────────────────

  private generateHeaderCells(fields: FormField[]) {
    const fixed = ['Timestamp', 'Respondent Email', 'Respondent Name'];
    return [...fixed, ...fields.map((f) => f.label)].map((label) => ({
      userEnteredValue: { stringValue: label },
      userEnteredFormat: {
        textFormat: { bold: true },
        backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
      },
    }));
  }

  private flattenResponseValues(response: FormResponse): string[] {
    return Object.values(response.values).map((v) =>
      Array.isArray(v) ? v.join(', ') : String(v ?? ''),
    );
  }

  private applyFilters(rows: string[][], headers: string[], filters: QueryFilter[]): string[][] {
    return rows.filter((row) =>
      filters.every((f) => {
        const colIdx = headers.indexOf(f.field);
        if (colIdx === -1) return true;
        const cell = row[colIdx] || '';
        switch (f.operator) {
          case 'eq':       return cell === String(f.value);
          case 'neq':      return cell !== String(f.value);
          case 'contains': return cell.includes(String(f.value));
          case 'gt':       return Number(cell) > Number(f.value);
          case 'lt':       return Number(cell) < Number(f.value);
          default:         return true;
        }
      }),
    );
  }

  private parseRowToResponse(
    row: string[],
    headers: string[],
    config: GoogleDatabaseConfig,
  ): FormResponse {
    const values: Record<string, string> = {};
    headers.slice(3).forEach((header, i) => {
      values[header] = row[i + 3] || '';
    });

    return {
      id: `${config.spreadsheetId}:${row[0]}`,
      formId: config.spreadsheetId,
      respondentEmail: row[1],
      respondentName: row[2],
      values,
      submittedAt: row[0],
    };
  }
}
