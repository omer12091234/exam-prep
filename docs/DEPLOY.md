# העלאה ל-Vercel עם Supabase

מה צריך: חשבון Supabase, חשבון Vercel שמחובר ל-GitHub, והריפו אצלך במחשב (`git pull`, `npm install`).

## 1. פרויקט Supabase

1. ב-[supabase.com](https://supabase.com) → **New project**. שמור את סיסמת ה-Database (צריך אותה בשלב 2).
   האזור: הכי קרוב אליכם (למשל Frankfurt).
2. כשהפרויקט מוכן, לחץ **Connect** (למעלה) → **Connection String**, והעתק שתי כתובות:
   - **Transaction pooler** (פורט 6543) → בשביל `DATABASE_URL`
   - **Session pooler** (פורט 5432) → בשביל `DIRECT_URL`

   בשתיהן מחליפים את `[YOUR-PASSWORD]` בסיסמה. אם יש בסיסמה תווים כמו `@ # / ?` צריך לקודד אותם
   (למשל `@` → `%40`), או פשוט לבחור סיסמה בלי תווים מיוחדים.
3. **Project Settings → API Keys**: העתק את **Project URL** ואת ה-**Publishable key** (`sb_publishable_...`).

## 2. יצירת הטבלאות וטעינת המבחן (פעם אחת, מהמחשב שלך)

ב-`.env` שלך (העתק מ-`.env.example`) החלף את שתי שורות ה-URL של הדמו:

```env
DATABASE_URL="<transaction pooler>?uselibpqcompat=true&sslmode=require"
DIRECT_URL="<session pooler>"
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
```

אחר כך:

```bash
npx prisma migrate deploy
```

```bash
npx prisma db seed
```

הפקודה הראשונה יוצרת את הטבלאות ומפעילה RLS על כולן (כדי שאי אפשר יהיה לקרוא אותן דרך ה-API הציבורי של Supabase).
השנייה טוענת את מבחן 2023 מועד א'.

> כדי לחזור לדמו המקומי, החזר ל-`.env` את השורות מ-`.env.example`.

## 3. Vercel

1. ב-[vercel.com](https://vercel.com) → **Add New → Project** → בחר את `exam-prep` → **Import**.
   ה-Framework אמור להיות **Next.js** (מוגדר גם ב-`vercel.json`). Root Directory: ריק.
2. לפני Deploy, ב-**Environment Variables** הוסף שלושה משתנים (אותם ערכים כמו ב-`.env`):

   | שם | ערך |
   |---|---|
   | `DATABASE_URL` | ה-Transaction pooler, כולל `?uselibpqcompat=true&sslmode=require` |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |

   `DIRECT_URL` לא צריך ב-Vercel (רק למיגרציות מהמחשב שלך).
3. **Deploy**. אם הפרויקט כבר קיים: אחרי הוספת המשתנים צריך **Redeploy**,
   כי משתני `NEXT_PUBLIC_` נכנסים לקוד בזמן ה-build.

אם חסרים פרטי Supabase, האתר מחזיר 503 עם הודעה. זה בכוונה: מצב הדמו (בלי התחברות) לא נדלק אף פעם ב-Vercel.

## 4. התחברות במייל

ב-Supabase → **Authentication → URL Configuration**:
- **Site URL**: כתובת האתר ב-Vercel, למשל `https://exam-prep-xxx.vercel.app`
- **Redirect URLs**: הוסף `https://exam-prep-xxx.vercel.app/auth/confirm`
  (ואם רוצים להתחבר גם מקומית: `http://localhost:3000/auth/confirm`)

בלי זה הקישור שנשלח במייל לא יחזיר אותך לאתר.

שים לב: שרת המייל המובנה של Supabase מוגבל לכמה מיילים בשעה, וזה מספיק לכמה חברים.
אם צריך יותר: **Authentication → Emails → SMTP Settings**.

## 5. להפוך את עצמך לאדמין

כל מי שמתחבר נוצר כמשתמש רגיל. אחרי שהתחברת פעם אחת, ב-Supabase → **SQL Editor**:

```sql
update "User" set role = 'ADMIN' where email = 'המייל-שלך@example.com';
```

## בדיקה

1. פותחים את כתובת Vercel → מועברים ל-`/login`.
2. מכניסים מייל → מקבלים קישור → חוזרים לאתר מחוברים.
3. רואים את הקורס "מבוא להנדסת חשמל 1" ובתוכו את מבחן 2023.

## תקלות נפוצות

| תקלה | פתרון |
|---|---|
| `PYTHON_ENTRYPOINT_NOT_FOUND` | ב-Vercel → Settings → Build and Deployment: Framework Preset = Next.js |
| 503 "Supabase is not configured" | חסרים משתני `NEXT_PUBLIC_SUPABASE_*` ב-Vercel, או שלא עשית Redeploy אחרי שהוספת |
| `self-signed certificate in certificate chain` | חסר `?uselibpqcompat=true&sslmode=require` בסוף `DATABASE_URL` |
| `prisma migrate deploy` נתקע או נכשל | ב-`DIRECT_URL` צריך את ה-Session pooler (5432), לא את ה-Transaction pooler (6543) |
| `password authentication failed` | הסיסמה לא נכונה או לא מקודדת (ראה שלב 1) |
| הקישור במייל מוביל ל-localhost | שלב 4: Site URL ו-Redirect URLs |
| האתר נפתח אבל אין קורסים | לא הרצת `npx prisma db seed` מול Supabase (שלב 2) |

## עדכון: migrations וייבוא רצים לבד בכל deploy

מאז שנוסף הסקריפט `vercel-build`, כל deploy ב-Vercel מריץ לפני הבנייה `prisma migrate deploy`, את ה-seed ואת ייבוא הקורסים (`data/study`). לכן אין צורך להריץ אותם ידנית מהמחשב (שלב 2), בתנאי ש-`DATABASE_URL` ו-`DIRECT_URL` מוגדרים ב-Vercel גם לסביבת ה-Build.

## בדיקה אוטומטית של פתרונות

כדי להפעיל את "שליחה לבדיקה" מוסיפים ב-Vercel את המשתנה `ANTHROPIC_API_KEY` (מפתח מ-console.anthropic.com) ועושים Redeploy. בלי המפתח שאר האתר עובד, ובדף השליחה מוצגת הודעה שהבדיקה לא הופעלה. כל בדיקה עולה כסף לבעל המפתח; יש מגבלה של 20 בדיקות ביממה למשתמש.

## הרשמה ומנהלים

משתמשים נרשמים ב-`/signup` (אימייל וסיסמה). אם ב-Supabase מופעל אישור אימייל (ברירת המחדל), נשלח מייל אישור, ולכן צריך להגדיר ב-Authentication → URL Configuration את כתובת האתר ואת `https://<האתר>/auth/confirm` ב-Redirect URLs. משתמש חדש הוא משתמש רגיל; את המנהל הראשון מגדירים ב-SQL (שלב 5), ואחר כך אפשר לקדם משתמשים מ-`/admin/users`.
