export interface Payee {
  id: number;
  shop: string;
  payTo: string;
  bank: string;
  acct: string;
  type: string;
  detail: string;
  line: string;
  status: string; // 'active' | 'inactive'
}

export interface CostCenter {
  id: number;
  name: string;
  dept: string;
}

export interface Txn {
  id: number;
  ord: number;
  date: string; // ISO yyyy-mm-dd
  voucher: string;
  cc: string;
  detail: string;
  payTo: string;
  bank: string;
  acct: string;
  recv: number;
  pay: number;
  note: string;
}

export interface Db {
  opening: number;
  dailyLimit: number;
  departments: string[];
  costCenters: CostCenter[];
  payees: Payee[];
  txns: Txn[];
}
