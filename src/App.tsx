import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { cn } from "./utils/cn";

type DealStatus = "active" | "completed" | "cancelled" | "dispute";
type NftStatus = "waiting" | "received" | "not_received";
type PaymentStatus = "waiting" | "paid" | "not_paid";
type ThemeMode = "light" | "dark";

type Deal = {
  id: number;
  seller: string;
  buyer: string;
  assetLink: string;
  priceStars: number;
  comment: string;
  nftStatus: NftStatus;
  paymentStatus: PaymentStatus;
  dealStatus: DealStatus;
  createdAt: string;
  timeline: string[];
};

type Review = {
  id: number;
  dealId: number;
  author: string;
  rating: number;
  text: string;
};

type Toast = {
  id: number;
  title: string;
  tone: "success" | "danger" | "info";
};

type TelegramWebApp = {
  ready?: () => void;
  expand?: () => void;
  requestFullscreen?: () => void;
  enableClosingConfirmation?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  initDataUnsafe?: {
    user?: {
      id?: number;
      username?: string;
      first_name?: string;
    };
  };
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

const statusCopy = {
  deal: {
    active: "Активна",
    completed: "Завершена",
    cancelled: "Отменена",
    dispute: "Спор",
  } satisfies Record<DealStatus, string>,
  nft: {
    waiting: "Ожидание",
    received: "NFT получено",
    not_received: "NFT не получено",
  } satisfies Record<NftStatus, string>,
  payment: {
    waiting: "Ожидание",
    paid: "Оплачено",
    not_paid: "Не оплачено",
  } satisfies Record<PaymentStatus, string>,
};

const initialDeals: Deal[] = [
  {
    id: 1001,
    seller: "@atlas_market",
    buyer: "@current_user",
    assetLink: "https://t.me/nft/PlushPepe-1192",
    priceStars: 12500,
    comment: "Premium gift transfer, manual verification only.",
    nftStatus: "received",
    paymentStatus: "paid",
    dealStatus: "completed",
    createdAt: "Сегодня, 10:24",
    timeline: [
      "Сделка создана пользователем @current_user",
      "Администратор подтвердил получение NFT",
      "Администратор подтвердил оплату Stars",
      "Сделка принудительно закрыта как completed",
    ],
  },
  {
    id: 1002,
    seller: "@nova_collect",
    buyer: "@current_user",
    assetLink: "https://t.me/nft/DurovsCap-441",
    priceStars: 7400,
    comment: "Ожидаем ручное подтверждение администратора.",
    nftStatus: "waiting",
    paymentStatus: "waiting",
    dealStatus: "active",
    createdAt: "Сегодня, 12:18",
    timeline: ["Сделка создана", "Карточка отправлена администратору @SABNWOK_bot"],
  },
  {
    id: 1003,
    seller: "@secure_seller",
    buyer: "@current_user",
    assetLink: "https://t.me/nft/SwissWatch-87",
    priceStars: 39900,
    comment: "Покупатель открыл спор по срокам передачи.",
    nftStatus: "not_received",
    paymentStatus: "paid",
    dealStatus: "dispute",
    createdAt: "Вчера, 19:05",
    timeline: ["Сделка создана", "Оплата подтверждена вручную", "Пользователь открыл спор"],
  },
];

const initialReviews: Review[] = [
  {
    id: 1,
    dealId: 1001,
    author: "@atlas_market",
    rating: 5,
    text: "Быстро, спокойно, все статусы подтверждались вручную администратором.",
  },
  {
    id: 2,
    dealId: 992,
    author: "@rare_assets",
    rating: 5,
    text: "Интерфейс понятный, ссылка на сделку удобна для второй стороны.",
  },
];

const violations = [
  "Попытка создать сделку с заблокированного аккаунта",
  "Повторная жалоба по спорной сделке",
  "Подозрительная ссылка в комментарии",
];

function useTelegramBridge(theme: ThemeMode) {
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    webApp?.expand?.();
    webApp?.requestFullscreen?.();
    webApp?.enableClosingConfirmation?.();
  }, []);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    const background = theme === "dark" ? "#080B16" : "#F7F8FC";
    webApp?.setHeaderColor?.(background);
    webApp?.setBackgroundColor?.(background);
  }, [theme]);
}

function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [screen, setScreen] = useState<Screen>("overview");
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [selectedDealId, setSelectedDealId] = useState(1002);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bannedUsers, setBannedUsers] = useState<Record<string, string>>({
    "@blocked_user": "Repeated violation of SABN escrow rules",
  });
  const [form, setForm] = useState({
    seller: "",
    assetLink: "",
    priceStars: "",
    comment: "",
  });
  const [reviewForm, setReviewForm] = useState({ rating: "5", text: "" });
  const [forceClose, setForceClose] = useState({ dealId: "1002", status: "completed" });

  useTelegramBridge(theme);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 720);
    return () => window.clearTimeout(timer);
  }, []);

  const selectedDeal = useMemo(
    () => deals.find((deal) => deal.id === selectedDealId) ?? deals[0],
    [deals, selectedDealId],
  );

  const activeDeals = deals.filter((deal) => deal.dealStatus === "active" || deal.dealStatus === "dispute");
  const completedDeals = deals.filter((deal) => deal.dealStatus === "completed");
  const currentUser = window.Telegram?.WebApp?.initDataUnsafe?.user?.username
    ? `@${window.Telegram.WebApp.initDataUnsafe.user.username}`
    : "@current_user";

  const pushToast = (title: string, tone: Toast["tone"] = "info") => {
    const id = Date.now();
    setToasts((items) => [...items, { id, title, tone }]);
    window.setTimeout(() => setToasts((items) => items.filter((toast) => toast.id !== id)), 3400);
  };

  const createDeal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const seller = sanitizeUsername(form.seller);
    const price = Number(form.priceStars);

    if (bannedUsers[currentUser]) {
      pushToast("Заблокированный пользователь не может создавать сделки", "danger");
      return;
    }

    if (!seller || !form.assetLink.startsWith("https://t.me/") || !Number.isFinite(price) || price <= 0) {
      pushToast("Проверьте username, ссылку t.me и цену в Stars", "danger");
      return;
    }

    const nextId = Math.max(...deals.map((deal) => deal.id)) + 1;
    const newDeal: Deal = {
      id: nextId,
      seller,
      buyer: currentUser,
      assetLink: form.assetLink.trim(),
      priceStars: price,
      comment: sanitizeText(form.comment),
      nftStatus: "waiting",
      paymentStatus: "waiting",
      dealStatus: "active",
      createdAt: "Только что",
      timeline: ["Сделка создана", "Уведомление отправлено администратору в Telegram"],
    };

    setDeals((items) => [newDeal, ...items]);
    setSelectedDealId(nextId);
    setScreen("deal");
    setForm({ seller: "", assetLink: "", priceStars: "", comment: "" });
    pushToast(`Deal ID ${nextId} создан, администратор уведомлен`, "success");
  };

  const updateDeal = (id: number, patch: Partial<Deal>, eventTitle: string) => {
    setDeals((items) =>
      items.map((deal) =>
        deal.id === id
          ? {
              ...deal,
              ...patch,
              timeline: [eventTitle, ...deal.timeline],
            }
          : deal,
      ),
    );
    pushToast(eventTitle, patch.dealStatus === "cancelled" ? "danger" : "success");
  };

  const openDispute = () => {
    updateDeal(selectedDeal.id, { dealStatus: "dispute" }, "Спор открыт и отправлен администратору");
  };

  const submitReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewForm.text.trim() || selectedDeal.dealStatus !== "completed") {
      pushToast("Отзыв доступен только после завершения сделки", "danger");
      return;
    }

    setReviews((items) => [
      {
        id: Date.now(),
        dealId: selectedDeal.id,
        author: currentUser,
        rating: Number(reviewForm.rating),
        text: sanitizeText(reviewForm.text),
      },
      ...items,
    ]);
    setReviewForm({ rating: "5", text: "" });
    pushToast("Отзыв сохранен и отправлен администратору", "success");
  };

  const copyDealLink = async () => {
    const link = `https://t.me/SABNWOK_bot/SABN?startapp=deal_${selectedDeal.id}`;
    await navigator.clipboard?.writeText(link);
    pushToast("Ссылка на сделку скопирована", "success");
  };

  const runForceClose = () => {
    const id = Number(forceClose.dealId);
    const status = forceClose.status as DealStatus;
    if (!deals.some((deal) => deal.id === id) || !["completed", "cancelled", "dispute", "active"].includes(status)) {
      pushToast("Используйте формат /force_close DEAL_ID STATUS", "danger");
      return;
    }
    updateDeal(id, { dealStatus: status }, `/force_close ${id} ${status}`);
  };

  const toggleBan = (username: string) => {
    const normalized = sanitizeUsername(username);
    if (!normalized) return;

    setBannedUsers((items) => {
      const next = { ...items };
      if (next[normalized]) {
        delete next[normalized];
        pushToast(`${normalized} разблокирован`, "success");
      } else {
        next[normalized] = "Manual admin block from SABN panel";
        pushToast(`${normalized} заблокирован`, "danger");
      }
      return next;
    });
  };

  return (
    <div className={cn(theme === "dark" && "dark")}>
      <main className="min-h-screen overflow-hidden bg-[#f7f8fc] text-slate-950 antialiased transition-colors duration-500 dark:bg-[#080b16] dark:text-white">
        <BackgroundAura />
        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
          <Header
            theme={theme}
            onThemeChange={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
            onNavigate={setScreen}
          />

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid flex-1 gap-4 pt-8 lg:grid-cols-[1.05fr_0.95fr]"
              >
                <SkeletonBlock className="h-[520px]" />
                <SkeletonBlock className="h-[520px]" />
              </motion.div>
            ) : (
              <motion.div
                key={screen}
                initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex-1"
              >
                {screen === "overview" && (
                  <Overview
                    activeDeals={activeDeals}
                    completedDeals={completedDeals}
                    deals={deals}
                    reviews={reviews}
                    onCreate={() => setScreen("create")}
                    onSelectDeal={(id) => {
                      setSelectedDealId(id);
                      setScreen("deal");
                    }}
                  />
                )}

                {screen === "create" && <CreateDeal form={form} setForm={setForm} onSubmit={createDeal} />}

                {screen === "deal" && selectedDeal && (
                  <DealWorkspace
                    deal={selectedDeal}
                    onCopy={copyDealLink}
                    onDispute={openDispute}
                    onReview={submitReview}
                    reviewForm={reviewForm}
                    setReviewForm={setReviewForm}
                  />
                )}

                {screen === "reviews" && <Reviews reviews={reviews} completedDeals={completedDeals.length} />}

                    deals={deals}
                    selectedDeal={selectedDeal}
                    forceClose={forceClose}
                    setForceClose={setForceClose}
                    bannedUsers={bannedUsers}
                    onSelectDeal={(id) => setSelectedDealId(id)}
                    onUpdateDeal={updateDeal}
                    onRunForceClose={runForceClose}
                    onToggleBan={toggleBan}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <ToastStack toasts={toasts} />
      </main>
    </div>
  );
}

function Header({
  theme,
  onThemeChange,
  onNavigate,
}: {
  theme: ThemeMode;
  onThemeChange: () => void;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <header className="sticky top-0 z-40 -mx-4 border-b border-white/60 bg-[#f7f8fc]/78 px-4 py-3 backdrop-blur-2xl dark:border-white/10 dark:bg-[#080b16]/78 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <button className="group flex min-w-0 items-center gap-3 text-left" onClick={() => onNavigate("overview")}>
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#5468ff] text-sm font-black text-white shadow-[0_20px_50px_rgba(84,104,255,0.35)]">
            S
            <span className="absolute inset-x-2 bottom-1 h-px bg-white/50" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-lg font-semibold tracking-tight">SABN</span>
            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">@SABNWOK_bot</span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 rounded-full border border-slate-200/80 bg-white/70 p-1 text-sm shadow-sm shadow-slate-200/50 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-none md:flex">
          <NavButton label="Главная" onClick={() => onNavigate("overview")} />
          <NavButton label="Создать" onClick={() => onNavigate("create")} />
          <NavButton label="Сделка" onClick={() => onNavigate("deal")} />
          <NavButton label="Отзывы" onClick={() => onNavigate("reviews")} />
          
        </nav>

        <div className="flex items-center gap-2">
          </div>
      </div>

      <nav className="mt-3 grid grid-cols-5 gap-1 md:hidden">
        {[
          ["Главная", "overview"],
          ["Создать", "create"],
          ["Сделка", "deal"],
          ["Отзывы", "reviews"],
          []
        ].map(([label, value]) => (
          ))}
      </nav>
    </header>
  );
}

function NavButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    );
}

function Overview({
  activeDeals,
  completedDeals,
  deals,
  reviews,
  onCreate,
  onSelectDeal,
}: {
  activeDeals: Deal[];
  completedDeals: Deal[];
  deals: Deal[];
  reviews: Review[];
  onCreate: () => void;
  onSelectDeal: (id: number) => void;
}) {
  return (
    <section className="grid gap-8 py-8 lg:grid-cols-[1.02fr_0.98fr] lg:py-12">
      <div className="flex min-h-[calc(100vh-130px)] flex-col justify-center gap-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.34em] text-[#5468ff]">Secure Assets Bridge Node</p>
          <h1 className="text-balance text-5xl font-semibold tracking-[-0.06em] text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
            SABN управляет сделками Telegram NFT, Gifts и Stars.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
            Мини-приложение для ручного escrow-процесса: без автопроверок блокчейна, без скрытых подтверждений, только статусы администратора.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            </div>
        </motion.div>

        <div className="grid max-w-2xl grid-cols-3 gap-3">
          <Metric label="Завершено" value={String(completedDeals.length)} />
          <Metric label="Активно" value={String(activeDeals.length)} />
          <Metric label="Отзывы" value={String(reviews.length)} />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.08, duration: 0.55, ease: "easeOut" }}
        className="relative flex min-h-[560px] flex-col justify-end overflow-hidden rounded-[2rem] border border-white/70 bg-slate-950 p-4 text-white shadow-[0_30px_90px_rgba(15,23,42,0.20)] dark:border-white/10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_15%,rgba(84,104,255,0.95),transparent_30%),radial-gradient(circle_at_72%_22%,rgba(255,255,255,0.26),transparent_18%),linear-gradient(135deg,#0b1020_0%,#111936_45%,#050711_100%)]" />
        <motion.div
          className="absolute left-1/2 top-16 h-64 w-64 -translate-x-1/2 rounded-full border border-white/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute left-1/2 top-24 h-44 w-44 -translate-x-1/2 rounded-full border border-[#9aa6ff]/30"
          animate={{ rotate: -360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        />

        <div className="relative z-10 rounded-[1.4rem] border border-white/10 bg-white/[0.08] p-5 backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-sm text-slate-300">System status</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Manual escrow active</h2>
            </div>
            <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">Online</span>
          </div>
          <div className="mt-4 space-y-2">
            {activeDeals.map((deal) => (
              <button
                key={deal.id}
                className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/10"
                onClick={() => onSelectDeal(deal.id)}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-[#7c8aff]" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">Deal #{deal.id} · {deal.seller}</span>
                  <span className="block truncate text-xs text-slate-400">{deal.assetLink}</span>
                </span>
                <span className="text-sm font-semibold">{deal.priceStars.toLocaleString("ru-RU")} Stars</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-slate-300 pl-4 dark:border-white/15">
      <p className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function CreateDeal({
  form,
  setForm,
  onSubmit,
}: {
  form: { seller: string; assetLink: string; priceStars: string; comment: string };
  setForm: (value: { seller: string; assetLink: string; priceStars: string; comment: string }) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="grid gap-8 py-8 lg:grid-cols-[0.82fr_1.18fr] lg:py-14">
      <div className="flex flex-col justify-center">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#5468ff]">New bridge</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-white sm:text-6xl">Создание сделки</h1>
        <p className="mt-5 max-w-md text-lg leading-8 text-slate-600 dark:text-slate-300">
          SABN генерирует Deal ID и ссылку. Дальше все подтверждения меняются только администратором через Telegram-панель.
        </p>
      </div>

      <form
        className="rounded-[2rem] border border-slate-200 bg-white/80 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/[0.05] sm:p-8"
        onSubmit={onSubmit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Username продавца" value={form.seller} placeholder="@seller" onChange={(seller) => setForm({ ...form, seller })} />
          <Input
            label="Цена в Stars"
            value={form.priceStars}
            placeholder="12500"
            inputMode="numeric"
            onChange={(priceStars) => setForm({ ...form, priceStars })}
          />
        </div>
        <div className="mt-4">
          <Input
            label="NFT/Gift ссылка"
            value={form.assetLink}
            placeholder="https://t.me/nft/..."
            onChange={(assetLink) => setForm({ ...form, assetLink })}
          />
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Комментарий</span>
          <textarea
            className="mt-2 min-h-36 w-full resize-none rounded-3xl border border-slate-200 bg-white px-4 py-4 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#5468ff] focus:ring-4 focus:ring-[#5468ff]/10 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
            placeholder="Условия передачи, ожидания по срокам, заметки для администратора"
            value={form.comment}
            onChange={(event) => setForm({ ...form, comment: event.target.value })}
            maxLength={500}
          />
        </label>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">JWT, CSRF и Telegram Init Data проверяются на API-слое.</p>
          </div>
      </form>
    </section>
  );
}

function DealWorkspace({
  deal,
  onCopy,
  onDispute,
  onReview,
  reviewForm,
  setReviewForm,
}: {
  deal: Deal;
  onCopy: () => void;
  onDispute: () => void;
  onReview: (event: FormEvent<HTMLFormElement>) => void;
  reviewForm: { rating: string; text: string };
  setReviewForm: (value: { rating: string; text: string }) => void;
}) {
  return (
    <section className="grid gap-6 py-8 lg:grid-cols-[1.12fr_0.88fr] lg:py-12">
      <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/[0.05] sm:p-8">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 dark:border-white/10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#5468ff]">Deal ID #{deal.id}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-white">Сделка SABN</h1>
            <p className="mt-3 text-slate-600 dark:text-slate-300">{deal.comment || "Комментарий не указан"}</p>
          </div>
          <StatusBadge status={deal.dealStatus} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Detail label="Продавец" value={deal.seller} />
          <Detail label="Покупатель" value={deal.buyer} />
          <Detail label="Стоимость" value={`${deal.priceStars.toLocaleString("ru-RU")} Stars`} />
          <Detail label="Создана" value={deal.createdAt} />
        </div>

        <a
          className="mt-5 block truncate rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-[#5468ff] transition hover:border-[#5468ff]/40 dark:border-white/10 dark:bg-white/[0.04]"
          href={deal.assetLink}
          target="_blank"
          rel="noreferrer"
        >
          {deal.assetLink}
        </a>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatusLine label="Статус NFT" value={statusCopy.nft[deal.nftStatus]} tone={deal.nftStatus === "received" ? "green" : "blue"} />
          <StatusLine label="Статус оплаты" value={statusCopy.payment[deal.paymentStatus]} tone={deal.paymentStatus === "paid" ? "green" : "blue"} />
          <StatusLine label="Статус сделки" value={statusCopy.deal[deal.dealStatus]} tone={deal.dealStatus === "dispute" ? "red" : "blue"} />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 backdrop-blur dark:border-white/10 dark:bg-white/[0.05] sm:p-6">
          <h2 className="text-xl font-semibold tracking-tight">Таймлайн событий</h2>
          <div className="mt-5 space-y-4">
            {deal.timeline.map((event, index) => (
              <div key={`${event}-${index}`} className="flex gap-3">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#5468ff]" />
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{event}</p>
              </div>
            ))}
          </div>
        </div>

        <form className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 backdrop-blur dark:border-white/10 dark:bg-white/[0.05] sm:p-6" onSubmit={onReview}>
          <h2 className="text-xl font-semibold tracking-tight">Отзыв после завершения</h2>
          <div className="mt-4 grid grid-cols-[120px_1fr] gap-3">
            <select
              className="rounded-2xl border border-slate-200 bg-white px-3 py-3 outline-none focus:border-[#5468ff] dark:border-white/10 dark:bg-white/[0.05]"
              value={reviewForm.rating}
              onChange={(event) => setReviewForm({ ...reviewForm, rating: event.target.value })}
            >
              {[5, 4, 3, 2, 1].map((rating) => (
                <option key={rating}>{rating}</option>
              ))}
            </select>
            <input
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-[#5468ff] dark:border-white/10 dark:bg-white/[0.05]"
              placeholder="Текст отзыва"
              value={reviewForm.text}
              onChange={(event) => setReviewForm({ ...reviewForm, text: event.target.value })}
            />
          </div>
          </form>
      </div>
    </section>
  );
}

function Reviews({ reviews, completedDeals }: { reviews: Review[]; completedDeals: number }) {
  return (
    <section className="py-8 lg:py-14">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#5468ff]">Trust profile</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-white sm:text-6xl">Отзывы и репутация</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600 dark:text-slate-300">Профиль показывает завершенные сделки, оценки и текстовые отзывы участников.</p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-[0.35fr_0.65fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 dark:border-white/10 dark:bg-white/[0.05]">
          <p className="text-5xl font-semibold tracking-tight">{completedDeals}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Завершенных сделок</p>
        </div>
        <div className="space-y-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-5 dark:border-white/10 dark:bg-white/[0.05]">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{review.author}</p>
                <p className="text-sm font-semibold text-[#5468ff]">{review.rating}/5 · Deal #{review.dealId}</p>
              </div>
              <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{review.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

  deals,
  selectedDeal,
  forceClose,
  setForceClose,
  bannedUsers,
  onSelectDeal,
  onUpdateDeal,
  onRunForceClose,
  onToggleBan,
}: {
  deals: Deal[];
  selectedDeal: Deal;
  forceClose: { dealId: string; status: string };
  setForceClose: (value: { dealId: string; status: string }) => void;
  bannedUsers: Record<string, string>;
  onSelectDeal: (id: number) => void;
  onUpdateDeal: (id: number, patch: Partial<Deal>, eventTitle: string) => void;
  onRunForceClose: () => void;
  onToggleBan: (username: string) => void;
}) {
  return (
    <section className="grid gap-6 py-8 lg:grid-cols-[0.74fr_1.26fr] lg:py-12">
      <aside className="rounded-[2rem] border border-slate-200 bg-white/82 p-4 dark:border-white/10 dark:bg-white/[0.05]">
        <div className="px-2 py-3">
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Панель управления</h1>
        </div>
        <div className="mt-2 space-y-2">
          {deals.map((deal) => (
            <button
              key={deal.id}
              className={cn(
                "w-full rounded-2xl px-4 py-3 text-left transition hover:bg-slate-100 dark:hover:bg-white/[0.07]",
                selectedDeal.id === deal.id && "bg-[#5468ff] text-white hover:bg-[#5468ff]",
              )}
              onClick={() => onSelectDeal(deal.id)}
            >
              <span className="block text-sm font-semibold">Deal #{deal.id}</span>
              <span className="block truncate text-xs opacity-70">{deal.seller} · {statusCopy.deal[deal.dealStatus]}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 dark:border-white/10 dark:bg-white/[0.05] sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Карточка сделки для inline-кнопок Telegram</p>
              <h2 className="text-2xl font-semibold tracking-tight">Deal #{selectedDeal.id}</h2>
            </div>
            <StatusBadge status={selectedDeal.dealStatus} />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 dark:border-white/10 dark:bg-white/[0.05] sm:p-6">
            <h2 className="text-xl font-semibold tracking-tight">/force_close</h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Команда работает независимо от текущего статуса сделки.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input label="Deal ID" value={forceClose.dealId} onChange={(dealId) => setForceClose({ ...forceClose, dealId })} />
              <Input label="STATUS" value={forceClose.status} onChange={(status) => setForceClose({ ...forceClose, status })} />
            </div>
            </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/82 p-5 dark:border-white/10 dark:bg-white/[0.05] sm:p-6">
            <h2 className="text-xl font-semibold tracking-tight">Баны и нарушения</h2>
            <div className="mt-4 space-y-3">
              {Object.entries(bannedUsers).map(([user, reason]) => (
                <div key={user} className="rounded-2xl bg-red-500/8 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  <strong>{user}</strong> · {reason}
                </div>
              ))}
              {violations.map((item) => (
                <div key={item} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-white/[0.05] dark:text-slate-300">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Input({
  label,
  value,
  placeholder,
  inputMode,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  inputMode?: "numeric" | "text";
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <input
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#5468ff] focus:ring-4 focus:ring-[#5468ff]/10 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-slate-50 px-4 py-4 dark:bg-white/[0.04]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 truncate font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function StatusLine({ label, value, tone }: { label: string; value: string; tone: "green" | "red" | "blue" }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p
        className={cn(
          "mt-2 font-semibold",
          tone === "green" && "text-emerald-600 dark:text-emerald-300",
          tone === "red" && "text-red-600 dark:text-red-300",
          tone === "blue" && "text-[#5468ff]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: DealStatus }) {
  const tone = status === "completed" ? "green" : status === "cancelled" || status === "dispute" ? "red" : "blue";
  return (
    <span
      className={cn(
        "inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-semibold",
        tone === "green" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        tone === "red" && "bg-red-500/10 text-red-700 dark:text-red-300",
        tone === "blue" && "bg-[#5468ff]/10 text-[#5468ff]",
      )}
    >
      {statusCopy.deal[status]}
    </span>
  );
}

  return (
    );
}

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[2rem] bg-slate-200/80 dark:bg-white/[0.06]", className)} />;
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 mx-auto flex max-w-md flex-col gap-2 px-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.96 }}
            className={cn(
              "rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl backdrop-blur-xl",
              toast.tone === "success" && "border-emerald-500/20 bg-emerald-50/90 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
              toast.tone === "danger" && "border-red-500/20 bg-red-50/90 text-red-800 dark:bg-red-500/15 dark:text-red-200",
              toast.tone === "info" && "border-[#5468ff]/20 bg-white/90 text-slate-800 dark:bg-slate-950/90 dark:text-white",
            )}
          >
            {toast.title}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function BackgroundAura() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute left-[-10%] top-[-20%] h-[520px] w-[520px] rounded-full bg-[#5468ff]/15 blur-3xl" />
      <div className="absolute bottom-[-24%] right-[-12%] h-[560px] w-[560px] rounded-full bg-slate-300/30 blur-3xl dark:bg-[#5468ff]/10" />
    </div>
  );
}

function sanitizeUsername(value: string) {
  const trimmed = value.trim().replace(/[^a-zA-Z0-9_@]/g, "");
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function sanitizeText(value: string) {
  return value.replace(/[<>]/g, "").trim();
}

export default App;