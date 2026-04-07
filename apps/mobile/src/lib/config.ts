import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};

export const Config = {
  apiUrl: (extra.apiUrl as string | undefined) ?? process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.0.100:3000",
  appVersion: Constants.expoConfig?.version ?? "1.0.0",
  isDev: __DEV__,
} as const;
