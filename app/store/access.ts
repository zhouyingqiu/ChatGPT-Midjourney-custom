import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StoreKey } from "../constant";
import { getHeaders } from "../client/api";
import { BOT_HELLO } from "./chat";
import { ALL_MODELS } from "./config";

export interface AccessControlStore {
  accessCode: string;
  token: string;

  needCode: boolean;
  hideUserApiKey: boolean;
  openaiUrl: string;
  midjourneyProxyUrl: string;
  useMjImgSelfProxy: boolean;

  updateToken: (_: string) => void;
  updateCode: (_: string) => void;
  updateMidjourneyProxyUrl: (_: string) => void;
  updateUserInfo: (a: string, b: string, c: boolean, d: number) => void;
  enabledAccessControl: () => boolean;
  isAuthorized: () => boolean;
  fetch: () => void;
  phoneNumber: string;
  userKey: string;
  isFree: boolean;
  freeType: number;
}

let fetchState = 0; // 0 not fetch, 1 fetching, 2 done

export const useAccessStore = create<AccessControlStore>()(
  persist(
    (set, get) => ({
      token: "",
      accessCode: "",
      needCode: true,
      hideUserApiKey: false,
      openaiUrl: "/api/openai/",
      midjourneyProxyUrl: "",
      useMjImgSelfProxy: false,
      phoneNumber: "",
      userKey: "",
      isFree: true,
      freeType: 1,
      enabledAccessControl() {
        get().fetch();

        return get().needCode;
      },
      updateCode(code: string) {
        set(() => ({ accessCode: code }));
      },
      updateToken(token: string) {
        set(() => ({ token }));
      },
      updateMidjourneyProxyUrl(midjourneyProxyUrl: string) {
        set(() => ({ midjourneyProxyUrl }));
      },
      updateUserInfo(
        userKey: string,
        phoneNumber: string,
        isFree: boolean,
        freeType = 0,
      ) {
        set(() => ({ phoneNumber, userKey, isFree, freeType }));
      },
      isAuthorized() {
        get().fetch();

        // has token or has code or disabled access control
        return (
          !!get().token || !!get().accessCode || !get().enabledAccessControl()
        );
      },
      fetch() {
        if (fetchState > 0) return;
        fetchState = 1;
        fetch("/api/config", {
          method: "post",
          body: null,
          headers: {
            ...getHeaders(),
          },
        })
          .then((res) => res.json())
          .then((res: DangerConfig) => {
            console.log("[Config] got config from server", res);
            set(() => ({ ...res }));

            if (!res.enableGPT4) {
              ALL_MODELS.forEach((model) => {
                if (model.name.startsWith("gpt-4")) {
                  (model as any).available = false;
                }
              });
            }

            if ((res as any).botHello) {
              BOT_HELLO.content = (res as any).botHello;
            }
          })
          .catch(() => {
            console.error("[Config] failed to fetch config");
          })
          .finally(() => {
            fetchState = 2;
          });
      },
    }),
    {
      name: StoreKey.Access,
      version: 1,
    },
  ),
);
