import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  Camera,
  EyeOff,
  ListChecks,
  MapPin,
  Megaphone,
  QrCode,
  Scale,
  Sparkles,
  Trash2,
  Trophy,
  Type as TypeIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { HeroArt } from "@/components/marketing/hero-art";
import { JoinCodeForm } from "@/components/marketing/join-code-form";
import {
  ActivityFeedMock,
  AdjustmentLogMock,
  CameraMissionMock,
  GpsMissionMock,
  LeaderboardMock,
  ReviewQueueMock,
  TextMissionMock,
} from "@/components/marketing/mocks";

export const metadata: Metadata = {
  title: "ציד מטמון שמזיז אנשים באמת",
  description:
    "בונים משימות צילום, טקסט ומיקום, מחלקים קוד הצטרפות אחד ומנקדים חבורה שלמה בזמן אמת: פיד פעילות, טבלת מובילים בדירוג אולימפי, נקודות בונוס ותור בדיקה כשבא לכם.",
  alternates: { canonical: "/" },
};

const shell = "mx-auto w-full max-w-6xl px-4 sm:px-6";
// `text-primary` rather than a `dark:` variant: the theme can also be forced
// with `data-theme`, which a media-query variant would not follow.
const eyebrow = "text-xs font-bold uppercase tracking-[0.18em] text-primary";
const h2 = "font-display text-3xl font-extrabold tracking-tight sm:text-4xl";
const lede = "mt-4 text-lg leading-relaxed text-muted-foreground";

/* ------------------------------------------------------------------ hero */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Decorative wash behind the hero; purely cosmetic. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-brand-400/12 blur-3xl"
      />
      <div
        className={`${shell} relative grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24`}
      >
        <div>
          <Badge tone="brand">ציד מטמון · משחקי קבוצות · ימי גיבוש</Badge>

          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            הופכים חבורה שלמה לקבוצות שרצות בין משימות{" "}
            <span className="text-primary">צילום, טקסט ומיקום</span>.
          </h1>

          <p className={lede}>
            בונים את המשימות בסטודיו, מחלקים קוד הצטרפות אחד, והניקוד רץ לבד.
            ההגשות נוחתות בפיד תוך שניות, טבלת המובילים מסדרת את עצמה, ואפשר
            לתקן, להסתיר או למחוק כל דבר בלי לעצור את המשחק.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/studio"
              className="inline-flex h-12 items-center rounded-md bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
            >
              יוצרים מרדף
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center rounded-md border border-border-strong bg-surface px-6 text-base font-semibold hover:bg-surface-muted"
            >
              איך זה עובד
            </a>
          </div>

          <div
            id="join"
            className="mt-8 max-w-md rounded-lg border border-border bg-surface p-4 shadow-card scroll-mt-24"
          >
            <JoinCodeForm />
          </div>
        </div>

        <HeroArt className="lg:mt-0" />
      </div>
    </section>
  );
}

/* -------------------------------------------------------- mission types */

const missionTypes = [
  {
    id: "camera",
    icon: Camera,
    name: "צילום",
    blurb:
      "תמונות, וידאו או שניהם — וידאו עד שלושים שניות. אפשר לנעול משימה לצילום בזמן אמת, אם לא בא לכם על העלאות מגלריית התמונות. משימות צילום מתקבלות ברגע שהן נוחתות; אין מה לבדוק.",
    facts: ["תמונה, וידאו או שניהם", "אפשר לנעול לצילום בזמן אמת", "תמיד מתקבלות אוטומטית"],
    mock: <CameraMissionMock />,
  },
  {
    id: "text",
    icon: TypeIcon,
    name: "טקסט",
    blurb:
      "כותבים את כל התשובות שיתקבלו. ההתאמה היא בערך מספיק, 92% דמיון: סדר המילים ויחיד או רבים לא משנים, שגיאות כתיב נסלחות, ומספרים עדיין חייבים להיות מדויקים. משאירים את הרשימה ריקה ומקבלים תשובה חופשית.",
    facts: ["התאמה מדויקת, בערך מספיק או תשובה חופשית", "נבדקת בשנייה שהיא נשלחת", "לא מופיעה בפיד כברירת מחדל"],
    mock: <TextMissionMock />,
  },
  {
    id: "gps",
    icon: MapPin,
    name: "צ'ק-אין במיקום",
    blurb:
      "קובעים יעד לפי חיפוש כתובת, לפי קואורדינטות או בלחיצה על המפה, ואז בוחרים רדיוס בין 25 מ' ל-5 ק\"מ. השחקנים לא רואים את הסיכה ולא את הרדיוס — הצ'ק-אין נבדק לפי מרחק.",
    facts: ["שמונה רדיוסים קבועים, מ-25 מ' עד 5 ק\"מ", "הסיכה והרדיוס נשארים מוסתרים", "נבדק לפי מרחק ברגע ההגעה"],
    mock: <GpsMissionMock />,
  },
];

function MissionTypes() {
  return (
    <section id="missions" className={`${shell} scroll-mt-20 py-20 sm:py-24`}>
      <div className="max-w-2xl">
        <p className={eyebrow}>סוגי משימות</p>
        <h2 className={`${h2} mt-3`}>שלושה סוגים של משימות, וזהו כל אוצר המילים.</h2>
        <p className={lede}>
          לכל משימה יש שם, תיאור, כמה נקודות היא שווה, ואם בא לכם גם תמונה
          וקישור. מעבר לזה בוחרים רק איך עונים עליה, מתי היא נפתחת ומתי היא
          נסגרת.
        </p>
      </div>

      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {missionTypes.map((type) => (
          <li
            key={type.id}
            className="flex flex-col rounded-lg border border-border bg-surface-muted/60 p-4 sm:p-5"
          >
            {type.mock}
            <h3 className="mt-5 flex items-center gap-2 font-display text-xl font-bold">
              <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <type.icon className="size-4" aria-hidden />
              </span>
              {type.name}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {type.blurb}
            </p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {type.facts.map((fact) => (
                <li key={fact} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <p className="mt-8 max-w-3xl text-sm text-muted-foreground">
        משימות יכולות להיפתח בהתחלה, בשעה שתקבעו, זמן קבוע לפני הסוף, אחרי
        שמשלימים משימה אחרת, או ברגע שקבוצה עוברת מספר נקודות — ומשימה נעולה לא
        נראית בכלל עד אז, כולל ההגשות שלה.
      </p>
    </section>
  );
}

/* ---------------------------------------------------------- live section */

const liveFeatures = [
  {
    icon: Activity,
    title: "פיד פעילות בזמן אמת",
    body:
      "כל הגשה שמתקבלת עולה לפיד המשותף ברגע שהיא נוחתת — תמונות, תשובות וצ'ק-אינים, וליד כל אחת הנקודות שהיא הכניסה. משימות טקסט נשארות מחוץ לפיד כברירת מחדל, שאף אחד לא יעתיק תשובה.",
  },
  {
    icon: Trophy,
    title: "טבלת מובילים שמדרגת את עצמה",
    body:
      "נקודות מלמעלה למטה, שוויון נשבר לפי מי הגיע לסכום קודם, ודירוג אולימפי: שלוש קבוצות במקום השני אומרות שהבאה אחריהן במקום החמישי. אפשר להציג אותה, להסתיר עד שתחשפו, או להחזיק עד שהמרדף נגמר.",
  },
  {
    icon: Sparkles,
    title: "נקודות בונוס וקנסות",
    body:
      "אפשר לתת נקודות נוספות על כל הגשה, עם סיבה שנדבקת אליהן. גם מספר שלילי עובד, אז קנס הוא פשוט בונוס עם מינוס — והקבוצה מקבלת התראה בשני המקרים.",
  },
  {
    icon: Megaphone,
    title: "הודעות לכולם",
    body:
      "שולחים הודעה לכולם או לקבוצות נבחרות: עכשיו, לפני ההתחלה, ברגע ההתחלה, בנקודת זמן באמצע המשחק, או אחרי הסוף. הודעה מתוזמנת נשארת פתוחה לעריכה עד שהיא יוצאת.",
  },
];

function RunningTheGame() {
  return (
    <section id="live" className="scroll-mt-20 border-y border-border bg-surface py-20 sm:py-24">
      <div className={shell}>
        <div className="max-w-2xl">
          <p className={eyebrow}>בזמן שהמרדף באוויר</p>
          <h2 className={`${h2} mt-3`}>רואים הכול קורה, ועדיין אפשר לשנות.</h2>
          <p className={lede}>
            הניקוד נסגר בשרת, אז אף אחד לא ישכנע את המכשיר שלו לתת לו עוד
            נקודות. כל השאר — משימות, תזמונים, קבוצות, נקודות — נשאר פתוח
            לעריכה בזמן שהמרדף רץ, והשינוי נכנס לתוקף מיד.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_minmax(0,24rem)] lg:gap-14">
          <ul className="grid gap-6 sm:grid-cols-2">
            {liveFeatures.map((feature) => (
              <li key={feature.title} className="rounded-lg border border-border bg-surface-muted/50 p-5">
                <span className="flex size-10 items-center justify-center rounded-md bg-accent/12 text-accent">
                  <feature.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </li>
            ))}
          </ul>

          <div className="space-y-6">
            <LeaderboardMock />
            <ActivityFeedMock />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- moderation */

const moderationFeatures = [
  {
    icon: ListChecks,
    title: "תור בדיקה, אם בא לכם",
    body:
      "מעבירים מרדף למצב בדיקה וההגשות מגיעות ממתינות במקום להיכנס ישר לניקוד. מאשרים, דוחים או מבקשים לעשות שוב, עם קיצורי מקלדת ופעולות על כמה הגשות ביחד. זה כבוי כברירת מחדל, אז שום דבר לא משתנה בלי שתבקשו.",
  },
  {
    icon: EyeOff,
    title: "להסתיר ולסמן",
    body:
      "אפשר להסתיר הגשה אחת מהפיד בלי למחוק אותה ובלי לקחת את הנקודות. כיתובים ותשובות טקסט נבדקים מול רשימת מילים חסומות ומסומנים להחלטה של בן אדם — שום דבר לא נמחק מאחורי הגב שלכם. גם שחקנים יכולים לדווח על הגשה.",
  },
  {
    icon: Trash2,
    title: "מחיקה עם סיבה",
    body:
      "מחיקה של הגשה מחזירה את הנקודות אוטומטית ושולחת לקבוצה התראה עם הסיבה שכתבתם, כדי שאף אחד לא יישאר לנחש. המשימה נפתחת מחדש והם יכולים לנסות שוב.",
  },
  {
    icon: Scale,
    title: "תיקוני ניקוד שמשאירים עקבות",
    body:
      "כל תיקון ניקוד לקבוצה דורש סיבה. כל שורה שומרת את הסכום, את הסיבה, מי עשה אותה ומתי, נשארת פתוחה לעריכה, ומשמשת גם כהיסטוריית הניקוד של הקבוצה.",
  },
];

function Moderation() {
  return (
    <section id="moderation" className={`${shell} scroll-mt-20 py-20 sm:py-24`}>
      <div className="max-w-2xl">
        <p className={eyebrow}>בקרה</p>
        <h2 className={`${h2} mt-3`}>שומרים על פיד נקי בלי לעצור את המשחק.</h2>
        <p className={lede}>
          כברירת מחדל כל הגשה מתקבלת אוטומטית, וזה גם מה שהשחקנים מצפים לו.
          הכלים שכאן קיימים בשביל הפעמים שזה לא מספיק.
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-14">
        <div className="space-y-6">
          <ReviewQueueMock />
          <AdjustmentLogMock />
        </div>

        <ul className="grid gap-6 sm:grid-cols-2">
          {moderationFeatures.map((feature) => (
            <li key={feature.title} className="rounded-lg border border-border bg-surface p-5 shadow-card">
              <span className="flex size-10 items-center justify-center rounded-md bg-brand-400/15 text-primary">
                <feature.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- how it works */

const steps = [
  {
    icon: ListChecks,
    title: "בונים את המשימות",
    body:
      "כותבים את ההוראות, קובעים כמה נקודות כל משימה שווה, ומחליטים מה נפתח מתי. אפשר לשכפל משימה, לשמור אותה בספרייה, או לשלוף אחת ממרדף קודם.",
  },
  {
    icon: QrCode,
    title: "מחלקים קוד הצטרפות או QR",
    body:
      "השחקנים סורקים את קוד ה-QR, נכנסים דרך קישור ההזמנה, או מקלידים את הקוד. אפשר להוסיף סיסמה למרדף אם הקבוצה סגורה, ולהכין קבוצות מראש אם אתם רוצים הרכבים קבועים.",
  },
  {
    icon: Activity,
    title: "צופים בפיד",
    body:
      "עולים באוויר, וההגשות מתחילות לנקד את עצמן. שולחים הודעות, מתקנים נקודות, ובסוף מייצאים את המשתתפים, ההגשות והמדיה.",
  },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-t border-border bg-surface py-20 sm:py-24"
    >
      <div className={shell}>
        <div className="max-w-2xl">
          <p className={eyebrow}>איך זה עובד</p>
          <h2 className={`${h2} mt-3`}>שלושה צעדים מרעיון למשחק שכבר רץ.</h2>
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="relative rounded-lg border border-border bg-surface-muted/60 p-6"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-extrabold text-primary-foreground">
                  {index + 1}
                </span>
                <step.icon className="size-5 text-accent" aria-hidden />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- CTA */

function ClosingCta() {
  return (
    <section className={`${shell} py-20 sm:py-24`}>
      <div className="rounded-xl bg-primary px-6 py-12 text-primary-foreground sm:px-12 sm:py-16">
        <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          בונים את המרדף הראשון.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed">
          מתחילים בסטודיו עם טיוטה, מוסיפים כמה משימות, ועולים באוויר כשמתחשק.
          שום דבר לא ננעל עד שתגידו.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/studio"
            className="inline-flex h-12 items-center rounded-md bg-surface px-6 text-base font-semibold text-foreground shadow-sm hover:bg-surface-muted"
          >
            יוצרים מרדף
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-12 items-center rounded-md border border-current px-6 text-base font-semibold hover:bg-white/10"
          >
            פותחים חשבון
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <>
      <Hero />
      <MissionTypes />
      <RunningTheGame />
      <Moderation />
      <HowItWorks />
      <ClosingCta />
    </>
  );
}
