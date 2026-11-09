import type {
  ApiKeyPermission,
  ISODateString,
  LiteralUnion,
  Monetary,
  Network,
  OkResponse,
} from './common.js';

// ---------------------------------------------------------------------------------------------
// Address book
// ---------------------------------------------------------------------------------------------

/** Address-book entry. */
export interface AddressBookEntry {
  id: number;
  title: string;
  network: string;
  address: string;
  tag?: string | null;
  createdAt: ISODateString;
}

/** `GET /address_book` */
export interface AddressBookResponse extends OkResponse {
  data: AddressBookEntry[];
}

/** `POST /address_book` */
export interface AddressBookEntryResponse extends OkResponse {
  data: AddressBookEntry;
}

/** Parameters for `POST /address_book` (deprecated one-step flow). */
export interface AddAddressParams {
  title: string;
  network: Network;
  address: string;
  /** Required on tag networks (BNB, EOS, PMN, XLM, XRP). */
  tag?: string;
  /** SMS/e-mail code from `security.requestOtp({ usage: 'address_book' })`. */
  otpCode: string;
  /** Current 2FA (TOTP) code. */
  tfaCode: string;
}

/** Parameters for `POST /security/address-book-item/create` (step 1 of 2). */
export interface CreateAddressBookItemParams {
  title: string;
  network: Network;
  address: string;
  /** Required on tag networks (BNB, EOS, PMN, XLM, XRP). */
  tag?: string;
  /** Current 2FA (TOTP) code. */
  tfaCode: string;
}

/** `POST /security/address-book-item/create` */
export interface CreateAddressBookItemResponse extends OkResponse {
  /** Id to confirm with `addressBook.confirmItem()`. */
  address_book_item_id: number;
}

/** Parameters for `POST /security/address-book-item/confirm` (step 2 of 2). */
export interface ConfirmAddressBookItemParams {
  /** `address_book_item_id` returned by `addressBook.createItem()`. */
  id: number;
  /** Code from `security.requestOtp({ type: 'email', usage: 'address_book' })`. */
  otpCode: string;
}

/** Parameters for `GET /security/validate-address-network`. */
export interface ValidateAddressParams {
  network: Network;
  address: string;
  /** Memo/tag to validate together with the address. */
  tag?: string;
}

/** Parameters for `POST /address_book/whitelist/deactivate`. */
export interface DeactivateWhitelistParams {
  /** Code from `security.requestOtp({ type: 'email', usage: 'deactivate_whitelist' })`. */
  otpCode: string;
  /** Current 2FA (TOTP) code. */
  tfaCode: string;
}

// ---------------------------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------------------------

/** Login attempt. */
export interface LoginAttempt {
  ip: string | null;
  ipCountry?: string | null;
  userAgent?: string | null;
  /** Whether the login came from a known device. */
  isKnown?: boolean;
  deviceId?: number | null;
  username: string;
  status: LiteralUnion<'Successful' | 'Unsuccessful'>;
  createdAt: ISODateString;
}

/** `POST /users/login-attempts` */
export interface LoginAttemptsResponse extends OkResponse {
  attempts: LoginAttempt[];
}

/** `POST /security/emergency-cancel/activate`, `POST /security/emergency-cancel/get-code` */
export interface EmergencyCancelResponse extends OkResponse {
  /** `code` is `null` when emergency cancel has never been activated. */
  cancelCode: { code: string | null };
}

/** Parameters for `POST /security/anti-phishing`. */
export interface SetAntiPhishingParams {
  /** 4–15 characters that will appear in every Nobitex e-mail. */
  code: string;
  /** Code from `security.requestOtp({ usage: 'anti_phishing_code' })`. */
  otpCode: string;
}

/** `GET /security/anti-phishing` */
export interface AntiPhishingResponse extends OkResponse {
  /** Masked code, e.g. `s*********g`. */
  antiPhishingCode: string;
}

/** Parameters for `POST /v2/otp/request`. */
export interface RequestOtpParams {
  /** Delivery channel. The documented value is `email`. */
  type: LiteralUnion<'email'>;
  /** What the code will be used for. */
  usage: LiteralUnion<'address_book' | 'anti_phishing_code' | 'deactivate_whitelist'>;
}

// ---------------------------------------------------------------------------------------------
// Referral
// ---------------------------------------------------------------------------------------------

/** Referral link/code. */
export interface ReferralLink {
  id: number;
  referralCode: string;
  createdAt: ISODateString;
  /** Referrer's share of the fee (percent). */
  userShare: number;
  /** Invitee's share of the fee (percent). */
  friendShare: number;
  description?: string | null;
  /** Referral programme id, e.g. `default`. */
  agenda?: string;
  statsRegisters: number;
  statsTrades: number;
  /** Total referral income in rials. */
  statsProfit: Monetary | number;
}

/** `POST /users/referral/links-list` */
export interface ReferralLinksResponse extends OkResponse {
  links: ReferralLink[];
}

/** `POST /users/referral/links-add` */
export interface CreateReferralLinkResponse extends OkResponse {
  /** The new link (a subset of the {@link ReferralLink} fields). */
  result: Partial<ReferralLink> & { referralCode: string };
}

/** `POST /users/referral/referral-status` */
export interface ReferralStatusResponse extends OkResponse {
  hasReferrer: boolean;
}

// ---------------------------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------------------------

/** Daily profit/loss report. Values are `0` (number) when there is no data for that day. */
export interface DailyProfit {
  report_date: string;
  total_profit: Monetary | number;
  total_profit_percentage: Monetary | number;
  total_balance?: Monetary | number;
}

/** Daily profit endpoints. */
export interface DailyProfitResponse extends OkResponse {
  data: DailyProfit[];
}

/** `POST /users/portfolio/last-month-total-profit` */
export interface TotalProfitResponse extends OkResponse {
  data: {
    total_profit: Monetary;
    total_profit_percentage: Monetary;
  };
}

// ---------------------------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------------------------

/** Parameters for `POST /auth/login/`. */
export interface LoginParams {
  /** Account e-mail. */
  username: string;
  password: string;
  /** Issue a long-lived token (`remember=yes`). */
  remember?: boolean;
  /** Use `api` (default) — requires an Iranian IP and 2FA enabled on the account. */
  captcha?: string;
  /**
   * Device id returned by a previous login. Re-sending it avoids the one-hour withdrawal lock
   * that is applied to new devices.
   */
  device?: string;
}

/** `POST /auth/login/` */
export interface LoginResponse {
  status: 'success';
  /** The API token. */
  key: string;
  device: string;
  /** Token lifetime in seconds. */
  expiresIn?: number;
}

/** `POST /auth/logout/` */
export interface LogoutResponse {
  detail?: string;
  message?: string;
}

/** `GET /auth/ws/token/` */
export interface WebSocketTokenResponse extends OkResponse {
  /** JWT used to connect to private WebSocket channels (valid for 1200 seconds). */
  token: string;
}

// ---------------------------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------------------------

/** API key metadata. */
export interface ApiKey {
  /** Public key — used as the `Nobitex-Key` header. */
  key: string;
  name: string;
  description: string;
  permissions: string;
  ipAddressesWhitelist: string[];
  expirationDate: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Parameters for `POST /apikeys/create`. */
export interface CreateApiKeyParams {
  name: string;
  description?: string;
  /** One or more of `READ`, `TRADE`, `WITHDRAW`, `DEPOSIT`, `ADDRESS_BOOK`, `OTP`, `VIP_CREDIT`. */
  permissions: readonly ApiKeyPermission[];
  /** Up to 15 allowed IPv4/IPv6 addresses (strongly recommended for `WITHDRAW`). */
  ipAddressesWhitelist?: readonly string[];
  /** Expiry (UTC). */
  expirationDate?: ISODateString | Date;
}

/** `POST /apikeys/create` */
export interface CreateApiKeyResponse extends OkResponse {
  key: ApiKey;
  /** Ed25519 private key — returned **only once**. Store it in a secret manager. */
  privateKey: string;
}

/** Parameters for `POST /apikeys/update/{key}`. */
export interface UpdateApiKeyParams {
  name?: string;
  description?: string;
  ipAddressesWhitelist?: readonly string[];
}

/** `POST /apikeys/update/{key}` */
export interface ApiKeyResponse extends OkResponse {
  key: ApiKey;
}

/** `GET /apikeys/list` */
export interface ListApiKeysResponse extends OkResponse {
  keys: ApiKey[];
}
