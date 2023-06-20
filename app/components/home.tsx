"use client";

require("../polyfill");

import { useState, useEffect } from "react";

import styles from "./home.module.scss";

import BotIcon from "../icons/bot.svg";
import LoadingIcon from "../icons/three-dots.svg";

import { getCSSVar, useMobileScreen, getCookie } from "../utils";

import dynamic from "next/dynamic";
import { Path, SlotID } from "../constant";
import { ErrorBoundary } from "./error";
import ChatGptFull from "../icons/chat-full.png";

import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { SideBar } from "./sidebar";
import { useAppConfig } from "../store/config";
import { useAccessStore } from "../store/access";

export function Loading(props: { noLogo?: boolean }) {
  return (
    <div className={styles["loading-content"] + " no-dark"}>
      {!props.noLogo && 
        <div
          style={{ height: "48px", overflow: "hidden", width: "60px",marginLeft: '12px' }}
        >
          <img
            src={ChatGptFull.src}
            style={{
              height: "44px",
              filter: "drop-shadow(#0969da 0 47px)",
              transform: "translateY(-45px) translateX(4px)",
            }}
          />
        </div>
      }
      {/* {!props.noLogo && <BotIcon />} */}
      <LoadingIcon />
    </div>
  );
}

const Settings = dynamic(async () => (await import("./settings")).Settings, {
  loading: () => <Loading noLogo />,
});

const Chat = dynamic(async () => (await import("./chat")).Chat, {
  loading: () => <Loading noLogo />,
});

const NewChat = dynamic(async () => (await import("./new-chat")).NewChat, {
  loading: () => <Loading noLogo />,
});

const MaskPage = dynamic(async () => (await import("./mask")).MaskPage, {
  loading: () => <Loading noLogo />,
});

export function useSwitchTheme() {
  const config = useAppConfig();

  useEffect(() => {
    document.body.classList.remove("light");
    document.body.classList.remove("dark");

    if (config.theme === "dark") {
      document.body.classList.add("dark");
    } else if (config.theme === "light") {
      document.body.classList.add("light");
    }

    const metaDescriptionDark = document.querySelector(
      'meta[name="theme-color"][media*="dark"]',
    );
    const metaDescriptionLight = document.querySelector(
      'meta[name="theme-color"][media*="light"]',
    );

    if (config.theme === "auto") {
      metaDescriptionDark?.setAttribute("content", "#151515");
      metaDescriptionLight?.setAttribute("content", "#fafafa");
    } else {
      const themeColor = getCSSVar("--theme-color");
      metaDescriptionDark?.setAttribute("content", themeColor);
      metaDescriptionLight?.setAttribute("content", themeColor);
    }
  }, [config.theme]);
}

const useHasHydrated = () => {
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return hasHydrated;
};

const loadAsyncGoogleFont = () => {
  const linkEl = document.createElement("link");
  linkEl.rel = "stylesheet";
  linkEl.href =
    "/google-fonts/css2?family=Noto+Sans+SC:wght@300;400;700;900&display=swap";
  document.head.appendChild(linkEl);
};

const fetchHasAuth = (): Promise<any> => {
  return new Promise((resolve) => {
    fetch(
      `/aimaster/lqw3cNjxfdtU?phone_number=${getCookie(
        "phone_number",
      )}&key=${getCookie("key")}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        method: "GET",
      },
    )
      .then((res) => {
        res.json().then((r) => {
          resolve(r);
        });
      })
      .finally(() => {
        // console.log(123)
      });
  });
};

function Screen() {
  const config = useAppConfig();
  const location = useLocation();
  const isHome = location.pathname === Path.Home;
  const isMobileScreen = useMobileScreen();

  const [hasAuth, setHasAuth] = useState(false);
  const CHECK_MINUTE = 1;
  const accessStore = useAccessStore();

  useEffect(() => {
    loadAsyncGoogleFont();
    async function fetchData() {
      try {
        const hasAuthValue = await fetchHasAuth(); // replace fetchHasAuth with your own asynchronous function to retrieve the value of hasAuth
        setHasAuth(hasAuthValue ? (hasAuthValue.status === 0 || hasAuthValue.status === -3 ) : false);
        // accessStore.updateUserInfo(getCookie(
        //   "key",
        // ), getCookie(
        //   "phone_number",
        // ), true, hasAuthValue.data ? 1 : 1);
        accessStore.updateUserInfo(
          getCookie("key"),
          getCookie("phone_number"),
          hasAuthValue.status === -3,
          hasAuthValue.data ? 2 : 1,
        );
        if (hasAuthValue.status !== 0) {
          // window.location.href = "https://chat.skadiseye.com/bot";
        }
      } catch (error) {
        console.error(error);
      }
    }
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 60000 * CHECK_MINUTE);
    return () => clearInterval(interval);
  }, []);

  if (!hasAuth) {
    // 这里跳转到登录页面
    return null;
  }
  return (
    <div
      className={
        styles.container +
        ` ${
          config.tightBorder && !isMobileScreen
            ? styles["tight-container"]
            : styles.container
        }`
      }
    >
      <SideBar className={isHome ? styles["sidebar-show"] : ""} />

      <div className={styles["window-content"]} id={SlotID.AppBody}>
        <Routes>
          <Route path={Path.Home} element={<Chat />} />
          <Route path={Path.NewChat} element={<NewChat />} />
          <Route path={Path.Masks} element={<MaskPage />} />
          <Route path={Path.Chat} element={<Chat />} />
          <Route path={Path.Settings} element={<Settings />} />
        </Routes>
      </div>
    </div>
  );
}

export function Home() {
  useSwitchTheme();

  if (!useHasHydrated()) {
    return <Loading />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <Screen />
      </Router>
    </ErrorBoundary>
  );
}
