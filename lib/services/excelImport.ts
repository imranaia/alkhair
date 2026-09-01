import "server-only";
import ExcelJS from "exceljs";

function cellText(value: ExcelJS.CellValue): string | undefined {
  if (value == null) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in value) return String((value as { text: string }).text).trim() || undefined;
  if (typeof value === "object" && "result" in value) return String((value as { result: unknown }).result ?? "").trim() || undefined;
  const text = String(value).trim();
  return text || undefined;
}

// Shared by every import type: row 1 is the header, everything below is data,
// and a row where every mapped column is blank is treated as a spacer, not data.
async function readSheetRows(
  buffer: ArrayBuffer,
  columns: readonly string[],
): Promise<{ rowNumber: number; raw: Record<string, string> }[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerMap = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const label = String(cell.value ?? "").trim();
    if (label) headerMap.set(label, colNumber);
  });

  const rows: { rowNumber: number; raw: Record<string, string> }[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const raw: Record<string, string> = {};
    for (const label of columns) {
      const col = headerMap.get(label);
      raw[label] = (col ? cellText(row.getCell(col).value) : undefined) ?? "";
    }
    if (!Object.values(raw).some((v) => v !== "")) return;

    rows.push({ rowNumber, raw });
  });

  return rows;
}

// ===================== Clients =====================

export type ParsedClientRow = {
  rowNumber: number;
  fullName?: string;
  phone?: string;
  address?: string;
  groupName?: string;
  enrollmentDate?: string;
  loanCollectorName?: string;
  openingSavings?: string;
  raw: Record<string, unknown>;
};

const CLIENT_COLUMNS = ["Full Name", "Phone", "Address", "Group", "Enrollment Date", "Collections Officer", "Opening Savings"] as const;

export async function parseClientsWorkbook(buffer: ArrayBuffer): Promise<ParsedClientRow[]> {
  const rows = await readSheetRows(buffer, CLIENT_COLUMNS);
  return rows.map(({ rowNumber, raw }) => ({
    rowNumber,
    fullName: raw["Full Name"] || undefined,
    phone: raw["Phone"] || undefined,
    address: raw["Address"] || undefined,
    groupName: raw["Group"] || undefined,
    enrollmentDate: raw["Enrollment Date"] || undefined,
    loanCollectorName: raw["Collections Officer"] || undefined,
    openingSavings: raw["Opening Savings"] || undefined,
    raw,
  }));
}

export async function buildClientsTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Clients");
  sheet.columns = CLIENT_COLUMNS.map((header) => ({ header, key: header, width: 20 }));
  sheet.addRow({
    "Full Name": "Jane Doe",
    Phone: "08012345678",
    Address: "12 Main Street",
    Group: "Group A",
    "Enrollment Date": "2026-07-27",
    "Collections Officer": "",
    "Opening Savings": "0",
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ===================== Expenses =====================

export type ParsedExpenseRow = {
  rowNumber: number;
  category?: string;
  description?: string;
  amount?: string;
  expenseDate?: string;
  receiptRef?: string;
  raw: Record<string, unknown>;
};

const EXPENSE_COLUMNS = ["Category", "Description", "Amount", "Expense Date", "Receipt Ref"] as const;

export async function parseExpensesWorkbook(buffer: ArrayBuffer): Promise<ParsedExpenseRow[]> {
  const rows = await readSheetRows(buffer, EXPENSE_COLUMNS);
  return rows.map(({ rowNumber, raw }) => ({
    rowNumber,
    category: raw["Category"] || undefined,
    description: raw["Description"] || undefined,
    amount: raw["Amount"] || undefined,
    expenseDate: raw["Expense Date"] || undefined,
    receiptRef: raw["Receipt Ref"] || undefined,
    raw,
  }));
}

export async function buildExpensesTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Expenses");
  sheet.columns = EXPENSE_COLUMNS.map((header) => ({ header, key: header, width: 20 }));
  sheet.addRow({
    Category: "Transport",
    Description: "Fuel for field visit",
    Amount: "5000",
    "Expense Date": "2026-07-27",
    "Receipt Ref": "",
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ===================== Daily Transactions =====================

export type ParsedTransactionRow = {
  rowNumber: number;
  clientCode?: string;
  transactionDate?: string;
  loanDisbursement?: string;
  loanRecovery?: string;
  profitInterest?: string;
  serviceCharge?: string;
  newSavings?: string;
  savingsRecall?: string;
  collateralTransferIn?: string;
  collateralTransferOut?: string;
  notes?: string;
  raw: Record<string, unknown>;
};

const TRANSACTION_COLUMNS = [
  "Client Code",
  "Date",
  "Principal Disbursement",
  "Principal Recovery",
  "Profit",
  "Service Charge",
  "New Savings",
  "Savings Recall",
  "Collateral In",
  "Collateral Out",
  "Notes",
] as const;

export async function parseTransactionsWorkbook(buffer: ArrayBuffer): Promise<ParsedTransactionRow[]> {
  const rows = await readSheetRows(buffer, TRANSACTION_COLUMNS);
  return rows.map(({ rowNumber, raw }) => ({
    rowNumber,
    clientCode: raw["Client Code"] || undefined,
    transactionDate: raw["Date"] || undefined,
    loanDisbursement: raw["Principal Disbursement"] || undefined,
    loanRecovery: raw["Principal Recovery"] || undefined,
    profitInterest: raw["Profit"] || undefined,
    serviceCharge: raw["Service Charge"] || undefined,
    newSavings: raw["New Savings"] || undefined,
    savingsRecall: raw["Savings Recall"] || undefined,
    collateralTransferIn: raw["Collateral In"] || undefined,
    collateralTransferOut: raw["Collateral Out"] || undefined,
    notes: raw["Notes"] || undefined,
    raw,
  }));
}

export async function buildTransactionsTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Transactions");
  sheet.columns = TRANSACTION_COLUMNS.map((header) => ({ header, key: header, width: 18 }));
  sheet.addRow({
    "Client Code": "ZUB-41-132",
    Date: "2026-07-27",
    "Principal Disbursement": "0",
    "Principal Recovery": "20000",
    Profit: "3460",
    "Service Charge": "350",
    "New Savings": "1190",
    "Savings Recall": "0",
    "Collateral In": "0",
    "Collateral Out": "0",
    Notes: "",
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ===================== Cash Book =====================

export type ParsedCashBookRow = {
  rowNumber: number;
  entryDate?: string;
  accountName?: string;
  details?: string;
  refType?: string;
  debit?: string;
  credit?: string;
  raw: Record<string, unknown>;
};

const CASH_BOOK_COLUMNS = ["Date", "Account", "Details", "Ref Type", "Debit", "Credit"] as const;

export async function parseCashBookWorkbook(buffer: ArrayBuffer): Promise<ParsedCashBookRow[]> {
  const rows = await readSheetRows(buffer, CASH_BOOK_COLUMNS);
  return rows.map(({ rowNumber, raw }) => ({
    rowNumber,
    entryDate: raw["Date"] || undefined,
    accountName: raw["Account"] || undefined,
    details: raw["Details"] || undefined,
    refType: raw["Ref Type"] || undefined,
    debit: raw["Debit"] || undefined,
    credit: raw["Credit"] || undefined,
    raw,
  }));
}

export async function buildCashBookTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Cash Book");
  sheet.columns = CASH_BOOK_COLUMNS.map((header) => ({ header, key: header, width: 18 }));
  sheet.addRow({
    Date: "2026-07-27",
    Account: "",
    Details: "Cash deposit",
    "Ref Type": "OR",
    Debit: "0",
    Credit: "54270",
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
