export const APP_CHAIN = {
  id: 143,
  name: "Monad",
  nativeTokenSymbol: "MON",
  explorerName: "Monad Explorer",
  explorerBaseUrl: "https://monadvision.com",
} as const;

export const APP_CHAIN_ID = APP_CHAIN.id;
export const APP_CHAIN_NAME = APP_CHAIN.name;
export const APP_CHAIN_NATIVE_TOKEN_SYMBOL = APP_CHAIN.nativeTokenSymbol;
export const APP_CHAIN_EXPLORER_NAME = APP_CHAIN.explorerName;
export const APP_CHAIN_EXPLORER_BASE_URL = APP_CHAIN.explorerBaseUrl;

function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function getExplorerAddressUrl(address: string): string {
  return `${trimTrailingSlash(APP_CHAIN_EXPLORER_BASE_URL)}/address/${address}`;
}

export function getExplorerTransactionUrl(txHash: string): string {
  return `${trimTrailingSlash(APP_CHAIN_EXPLORER_BASE_URL)}/tx/${txHash}`;
}
