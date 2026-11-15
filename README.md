# exam-prep

אתר לתרגול ומעקב למידה למבחנים. Next.js 16, Prisma 7, Supabase.

## הרצת הדוגמה (מקומית, בלי Supabase ובלי Docker)

צריך Node.js 20 ומעלה.

```bash
cp .env.example .env
npm install
npm run demo
```

`npm run demo` מפעיל Postgres מקומי (`prisma dev`, פורט 51214), מריץ migrations,
טוען את מבחן מבוא להנדסת חשמל 1, 2023 מועד א' (3 שאלות, 19 סעיפים, חיתוכים והערות בודק)
ומפעיל את האתר ב-http://localhost:3000.

כשאין `NEXT_PUBLIC_SUPABASE_URL` ב-`.env` האתר רץ במצב דמו: אין התחברות, ויש משתמש אדמין מקומי אחד.

פקודות נוספות:

| פקודה | מה עושה |
|---|---|
| `npm run db:start` / `npm run db:stop` | הפעלה / עצירה של ה-Postgres המקומי |
| `npm run db:setup` | migrations + seed (בטוח להריץ שוב) |
| `npm run dev` | רק האתר, כשה-DB כבר רץ |

## דוגמת החיתוך

צריך Python 3 עם `pip install -r ingest/requirements.txt`.

```bash
python3 -I ingest/crop.py ingest/example/extraction.json ingest/example/pages out
```

התוצאה בתיקייה `out/`: חיתוך לכל סעיף ולגוף השאלה, `manifest.json` ותמונות `overlay_*.jpg` לבדיקה.
פרטים על תהליך הקליטה ב-[ingest/README.md](ingest/README.md).

## Supabase (פרודקשן)

ממלאים ב-`.env` את פרטי Supabase לפי ההערות ב-`.env.example`, ואז `npx prisma migrate deploy`.
