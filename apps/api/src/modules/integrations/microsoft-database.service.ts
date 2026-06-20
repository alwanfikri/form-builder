import { Injectable, Logger } from '@nestjs/common';
import { Client } from '@microsoft/microsoft-graph-client';
import type {
  FormSchema, FormResponse, MicrosoftDatabaseConfig,
  QueryFilter,
} from '@form-builder/shared';

@Injectable()
export class MicrosoftDatabaseService {
  private readonly logger = new Logger(MicrosoftDatabaseService.name);

  private getClient(accessToken: string): Client {
    return Client.init({
      authProvider: (done) => done(null, accessToken),
    });
  }

  async createFormDatabase(
    formSchema: FormSchema,
    userAccessToken: string,
  ): Promise<MicrosoftDatabaseConfig> {
    const client = this.getClient(userAccessToken);
    const driveId = process.env.SHAREPOINT_DRIVE_ID!;

    // 1. Create folder in SharePoint
    const folder = await client
      .api(`/drives/${driveId}/root/children`)
      .post({
        name: `Form-${formSchema.id}`,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename',
      });

    // 2. Upload blank Excel workbook (Graph creates it automatically from empty content)
    const safeName = formSchema.name.replace(/[^a-zA-Z0-9 _-]/g, '_');
    const workbookPath = `Forms/${safeName}-${formSchema.id}.xlsx`;

    const workbook = await client
      .api(`/drives/${driveId}/root:/${workbookPath}:/content`)
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .put(Buffer.from(''));

    // 3. Rename default sheet and add header row
    const sheetName = 'FormResponses';
    const headers = [
      'Timestamp',
      'Respondent Email',
      ...formSchema.fields.map((f) => f.label),
    ];

    try {
      await client
        .api(`/drives/${driveId}/items/${workbook.id}/workbook/worksheets/Sheet1`)
        .patch({ name: sheetName });
    } catch {
      // Sheet may already be named differently; continue
    }

    await client
      .api(`/drives/${driveId}/items/${workbook.id}/workbook/worksheets/${sheetName}/range(address='A1:${this.colLetter(headers.length)}1')`)
      .patch({ values: [headers] });

    // 4. Set permissions (internal group)
    try {
      await client
        .api(`/drives/${driveId}/items/${workbook.id}/invite`)
        .post({
          recipients: [{ email: process.env.INTERNAL_GROUP_EMAIL }],
          roles: ['write'],
          requireSignIn: true,
          message: `Form Builder: ${formSchema.name} response sheet`,
        });
    } catch (err) {
      this.logger.warn('Could not set workbook permissions', err);
    }

    return {
      provider: 'microsoft',
      driveId,
      itemId: workbook.id,
      folderId: folder.id,
      tableName: sheetName,
      webUrl: workbook.webUrl,
    };
  }

  async submitResponse(
    config: MicrosoftDatabaseConfig,
    response: FormResponse,
    userAccessToken: string,
  ): Promise<{ rowId: string; timestamp: string }> {
    const client = this.getClient(userAccessToken);
    const timestamp = new Date().toISOString();

    const values = [
      timestamp,
      response.respondentEmail || '',
      ...Object.values(response.values).map((v) =>
        Array.isArray(v) ? v.join(', ') : String(v ?? ''),
      ),
    ];

    // Append by finding the first empty row
    const usedRange = await client
      .api(`/drives/${config.driveId}/items/${config.itemId}/workbook/worksheets/${config.tableName}/usedRange`)
      .get();

    const nextRow = (usedRange.rowCount || 1) + 1;
    const colEnd = this.colLetter(values.length);
    const range = `A${nextRow}:${colEnd}${nextRow}`;

    await client
      .api(`/drives/${config.driveId}/items/${config.itemId}/workbook/worksheets/${config.tableName}/range(address='${range}')`)
      .patch({ values: [values] });

    return { rowId: `row-${nextRow}`, timestamp };
  }

  async queryResponses(
    config: MicrosoftDatabaseConfig,
    userAccessToken: string,
    filters?: QueryFilter[],
    pagination?: { page: number; limit: number },
  ): Promise<FormResponse[]> {
    const client = this.getClient(userAccessToken);

    const usedRange = await client
      .api(`/drives/${config.driveId}/items/${config.itemId}/workbook/worksheets/${config.tableName}/usedRange`)
      .get();

    const allValues: string[][] = usedRange.values || [];
    if (allValues.length <= 1) return [];

    const headers: string[] = allValues[0];
    let dataRows: string[][] = allValues.slice(1);

    if (filters?.length) {
      dataRows = dataRows.filter((row) =>
        filters.every((f) => {
          const idx = headers.indexOf(f.field);
          if (idx === -1) return true;
          const cell = row[idx] || '';
          switch (f.operator) {
            case 'eq':       return cell === String(f.value);
            case 'contains': return cell.includes(String(f.value));
            case 'gt':       return Number(cell) > Number(f.value);
            case 'lt':       return Number(cell) < Number(f.value);
            default:         return true;
          }
        }),
      );
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;
    const start = (page - 1) * limit;
    const paginated = dataRows.slice(start, start + limit);

    return paginated.map((row) => {
      const values: Record<string, string> = {};
      headers.slice(2).forEach((h, i) => { values[h] = row[i + 2] || ''; });
      return {
        id: `${config.itemId}:${row[0]}`,
        formId: config.itemId,
        respondentEmail: row[1],
        values,
        submittedAt: row[0],
      };
    });
  }

  async uploadAttachment(
    driveId: string,
    folderId: string,
    file: Buffer,
    filename: string,
    mimeType: string,
    userAccessToken: string,
  ): Promise<{ itemId: string; webUrl: string }> {
    const client = this.getClient(userAccessToken);

    const response = await client
      .api(`/drives/${driveId}/items/${folderId}:/${filename}:/content`)
      .header('Content-Type', mimeType)
      .put(file);

    return { itemId: response.id, webUrl: response.webUrl };
  }

  // ─── Helpers ───────────────────────────────────────────────

  private colLetter(n: number): string {
    let result = '';
    while (n > 0) {
      n--;
      result = String.fromCharCode(65 + (n % 26)) + result;
      n = Math.floor(n / 26);
    }
    return result;
  }
}
