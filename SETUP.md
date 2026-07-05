# CMS-Einrichtung – SAV OG Steinenberg
## Sveltia CMS + GitHub OAuth + Cloudflare Worker

Diese Anleitung muss **einmalig** durchgeführt werden.
Danach kann der Kunde unter `/admin` Inhalte pflegen.

---

## Übersicht

```
Browser (Kunde)
    │
    ├─→ GitHub OAuth App  (Login-Bestätigung)
    │         │
    │         ▼
    └─→ Cloudflare Worker  (sveltia-cms-auth)
              │
              ▼
          GitHub API  (JSON-Dateien in /content/ bearbeiten)
              │
              ▼
      Cloudflare Pages  (baut & veröffentlicht die Website)
```

---

## Schritt 1 – GitHub OAuth App erstellen

> Dauer: ~5 Minuten

1. Öffnen Sie: **https://github.com/settings/developers**
2. Klicken Sie **"New OAuth App"**
3. Füllen Sie das Formular aus:

   | Feld | Wert |
   |---|---|
   | Application name | `SAV Steinenberg CMS` |
   | Homepage URL | `https://albverein-steinenberg.pages.dev` *(oder Ihre Domain)* |
   | Authorization callback URL | `https://DEIN-WORKER.workers.dev/callback` *(wird in Schritt 2 bekannt)* |

4. Klicken Sie **"Register application"**
5. Notieren Sie sich:
   - **Client ID** (sofort sichtbar)
   - **Client Secret** (auf "Generate a new client secret" klicken, **einmalig sichtbar** – sofort kopieren!)

---

## Schritt 2 – Cloudflare Worker deployen (sveltia-cms-auth)

> Dauer: ~10 Minuten

### 2a. Worker-Code aus GitHub holen

Der offizielle Auth-Worker: **https://github.com/sveltia/sveltia-cms-auth**

```bash
git clone https://github.com/sveltia/sveltia-cms-auth.git
cd sveltia-cms-auth
npm install
```

### 2b. Worker deployen

```bash
npx wrangler deploy
```

*Falls noch nicht angemeldet: `npx wrangler login` zuerst.*

Nach dem Deploy gibt Wrangler die Worker-URL aus, z.B.:
```
https://sveltia-cms-auth.IHR-ACCOUNT.workers.dev
```

> **Diese URL notieren** – Sie benötigen sie in Schritt 1 (Callback-URL) und Schritt 3.

### 2c. Umgebungsvariablen setzen

Im Cloudflare-Dashboard → **Workers & Pages** → Ihr Worker → **Settings** → **Variables**:

| Variable | Wert |
|---|---|
| `GITHUB_CLIENT_ID` | Client ID aus Schritt 1 |
| `GITHUB_CLIENT_SECRET` | Client Secret aus Schritt 1 (**als Secret speichern!**) |

Alternativ per CLI:
```bash
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
```

### 2d. Callback-URL in GitHub nachtragen

Zurück zu **https://github.com/settings/developers** → Ihre App öffnen →
**"Authorization callback URL"** auf `https://DEIN-WORKER.workers.dev/callback` setzen → Speichern.

---

## Schritt 3 – admin/config.yml aktualisieren

Öffnen Sie die Datei [`admin/config.yml`](admin/config.yml) und ersetzen Sie den Platzhalter:

```yaml
backend:
  base_url: https://DEIN-WORKER.workers.dev   # ← Diese Zeile anpassen
```

Durch Ihre tatsächliche Worker-URL, z.B.:

```yaml
backend:
  base_url: https://sveltia-cms-auth.meinaccount.workers.dev
```

Dann committen und pushen:
```bash
git add admin/config.yml
git commit -m "CMS: Worker-URL eintragen"
git push
```

---

## Schritt 4 – Cloudflare Pages einrichten (falls noch nicht geschehen)

1. **https://dash.cloudflare.com** → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Repo `Hannes0777/albverein-steinenberg` auswählen
3. Build-Einstellungen:
   - **Framework preset:** None
   - **Build command:** *(leer lassen)*
   - **Build output directory:** `/` *(Stammverzeichnis)*
4. **"Save and Deploy"**
5. Nach dem Deploy → **Settings** → **Custom domains** → eigene Domain verknüpfen (optional)

---

## Schritt 5 – CMS testen

1. Öffnen Sie: `https://ihre-domain.pages.dev/admin`
2. Klicken Sie **"Mit GitHub anmelden"**
3. GitHub fragt nach Berechtigungen → **"Authorize"**
4. Sie sehen jetzt das CMS-Interface.

### Was der Kunde bearbeiten kann:

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

---

## Workflow für den Kunden

```
1. albverein-steinenberg.pages.dev/admin öffnen
2. Mit GitHub anmelden (nur beim ersten Mal)
3. Inhalt bearbeiten & speichern
4. → GitHub-Commit wird automatisch erstellt
5. → Cloudflare Pages baut & veröffentlicht in ~1 Minute
```

**Bilder** werden in den Ordner `/uploads/` gespeichert und sind sofort auf der Website verfügbar.

---

## Troubleshooting

| Problem | Lösung |
|---|---|
| Login schlägt fehl | Worker-URL in `admin/config.yml` prüfen; Callback-URL in GitHub OAuth App prüfen |
| Änderungen erscheinen nicht | 2–3 Minuten warten (Cloudflare Pages Build); Browser-Cache leeren |
| "Not authorized" Fehler | GITHUB_CLIENT_ID und GITHUB_CLIENT_SECRET im Worker prüfen |
| Bild wird nicht angezeigt | Pfad muss mit `/uploads/` beginnen; Worker neu deployen nach Secret-Änderung |

---

*Einrichtung abgeschlossen. Für Fragen: Michael Ehmann, 07183 428556*
