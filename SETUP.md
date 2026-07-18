# CMS-Einrichtung – SAV OG Steinenberg

## Was ist `/admin`?

Unter `/admin` befindet sich ein kleines Redaktionssystem (Sveltia CMS), mit dem der Verein
Texte, Termine und Kontaktdaten auf der Website selbst ändern kann – ganz ohne
Programmierkenntnisse. Alle Inhalte liegen als JSON-Dateien im Ordner `/content/` und werden
dort direkt von der Website eingelesen.

> **Login bereits eingerichtet:** Diese Website hat ihr **eigenes** Login, komplett getrennt von
> den anderen Kundenwebsites – kein GitHub-Account nötig, nur E-Mail + Passwort. Technisch läuft
> das über einen eigenen, nur für diese Website zuständigen Cloudflare-Worker
> (`cms-auth-albverein-steinenberg`), der die Anmeldung prüft und im Hintergrund die Commits macht.
> Zugangsdaten hat Michael Ehmann. Passwort ändern: `wrangler secret put AUTH_PASSWORD_HASH` im
> Ordner `cms-auth-workers/albverein-steinenberg` (Hash mit
> `node generate-credentials.js <neues-passwort>` erzeugen).

---

## Was der Verein jetzt selbst bearbeiten kann

| Bereich im CMS | Was ändert sich auf der Website |
|---|---|
| 📢 Aktuelles & Neuigkeiten | Neue Beiträge mit Text & Bild erscheinen auf der Startseite |
| 🥾 Wanderplan | Touren hinzufügen, bearbeiten, Status ändern |
| ⚙️ Allgemeine Seiteninfos | Seitentitel, Beschreibung, Mitgliederzahl |
| ⚙️ Startseite | Überschrift und Untertitel des Willkommensbereichs |
| ⚙️ Kontakt & Adresse | Telefon, Adresse, Website-Link |
| 🏔 Über uns | Die drei Absätze und die Häkchenliste |
| 📅 Chronik | Einträge hinzufügen oder bearbeiten |
| 👥 Führungsteam | Personen hinzufügen, entfernen, Rollen ändern |
| 💶 Beiträge & Mitgliedschaft | Preise und Leistungsliste anpassen |
| 🖼 Bildergalerie | Fotos hochladen, Beschriftungen anpassen |
| 📥 Downloads | Dokumente hochladen, verwalten |

---

## Workflow für den Verein

```
1. albverein-steinenberg-domain/admin öffnen
2. Mit E-Mail + Passwort anmelden
3. Inhalt bearbeiten & speichern
4. → Im Hintergrund wird automatisch ein Commit erstellt
5. → Die Website baut & veröffentlicht in ~1-2 Minuten
```

**Bilder** werden in den Ordner `/uploads/` gespeichert und sind sofort auf der Website verfügbar.

---

## Troubleshooting

| Problem | Lösung |
|---|---|
| E-Mail/Passwort falsch | Zugangsdaten bei Michael Ehmann erfragen; Passwort kann jederzeit neu gesetzt werden (siehe oben) |
| "Zu viele Anmeldeversuche" | Kurz warten (unter einer Minute) und erneut versuchen |
| Änderungen erscheinen nicht | 1–2 Minuten warten (Build/Deploy); Browser-Cache leeren |

---

*Für Fragen: Michael Ehmann, 07183 428556*
