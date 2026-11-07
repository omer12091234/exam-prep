# קליטת תוכן (רץ מקומית דרך Claude Code, לא דרך ה-API)

## שלבים
1. `pdftoppm -r 150 -png file.pdf pages/p` – עמודים כתמונות.
2. Claude Code קורא כל עמוד ומחזיר JSON בפורמט `example_extraction.json`:
   - מבנה: שאלות, תתי סעיפים, ניקוד, תמלול עם LaTeX.
   - `box` לכל אזור (בקואורדינטות של תמונת התצוגה + `view`), **ו-`lines` = מספר שורות הטקסט בכל סעיף**.
   - `regions` יכולים להיות כמה – למשל שרטוט שמופיע אחרי הסעיפים.
   - `noise` – כתב יד של סטודנט שנמצא על דף השאלון.
3. `python3 -I crop.py extraction.json pages/ out/` – זיהוי שורות אמיתיות לפי היטל דיו
   ברצועה הימנית (RTL) ושיוך לפי סדר ומספר השורות. חוזר ל-box רק כשהספירה לא מתאימה.
4. העלאה ל-Storage + כתיבה ל-DB עם `needsReview=true` → מסך אישור לאדמין.

## לפי סוג קובץ
| סוג | מה עושים |
|---|---|
| EXAM_SCAN | חילוץ שאלות + חיתוך (למעלה) |
| LECTURER_SOLUTION | תמלול בלבד → `Solution(author=LECTURER)` לפי כותרות "שאלה/סעיף" |
| GRADED_NOTEBOOK | עמוד 1 = שכבת טקסט (`pdftotext -layout`) → ניקוד והערות בודק לכל סעיף, בלי OCR |
| STATS | ממוצע / סטיית תקן / אחוז נכשלים → שדות `stat*` ב-Exam |
| STUDENT_SOLUTION | אופציונלי, `author=STUDENT`, לא נכנס לפרופיל הבדיקה |

## TODO
- deskew לפני חיתוך (צילומי טלפון מוטים → פס דק משורה שכנה)
- dedup לפי sha256 לפני הכל
- המרה ל-WebP
