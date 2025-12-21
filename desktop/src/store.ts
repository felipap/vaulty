import Store from "electron-store";

type StoreSchema = {
  serverUrl: string;
  screenCapture: {
    enabled: boolean;
    intervalMinutes: number;
  };
};

export const store = new Store<StoreSchema>({
  defaults: {
    serverUrl: "http://localhost:3000",
    screenCapture: {
      enabled: true,
      intervalMinutes: 5,
    },
  },
});

