export default function Datenschutz() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <a href="/landing" className="text-sm text-primary hover:underline mb-8 inline-block">← Zurück</a>
        <h1 className="text-3xl font-bold mb-8">Datenschutzerklärung</h1>

        <div className="space-y-8 text-sm text-muted-foreground">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">1. Datenschutz auf einen Blick</h2>
            <h3 className="font-medium text-foreground mb-1">Allgemeine Hinweise</h3>
            <p>Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">2. Verantwortlicher</h2>
            <p>
              Verantwortlicher für die Datenverarbeitung auf dieser Website ist:<br /><br />
              Huwa Gebäudereinigung & Hausmeisterdienste<br />
              Mittelweg 24<br />
              56566 Neuwied<br />
              Telefon: 02601/9131820<br />
              E-Mail: info@huwa-gebaeudedienste.de
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">3. Erhebung und Speicherung personenbezogener Daten</h2>
            <h3 className="font-medium text-foreground mb-1">Beim Besuch der Website</h3>
            <p>
              Beim Aufrufen unserer Website werden durch den Browser automatisch Informationen an den Server übermittelt (Server-Log-Dateien). Dies umfasst: Browsertyp und Browserversion, verwendetes Betriebssystem, Referrer URL, Hostname des zugreifenden Rechners, Uhrzeit der Serveranfrage, IP-Adresse.
              <br /><br />
              Diese Daten werden nicht mit anderen Datenquellen zusammengeführt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
            </p>

            <h3 className="font-medium text-foreground mt-4 mb-1">Bei der Registrierung / Nutzung der Software</h3>
            <p>
              Bei der Registrierung und Nutzung unserer SaaS-Software erheben wir folgende Daten:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Name und E-Mail-Adresse (für den Account)</li>
              <li>Rechnungs- und Zahlungsdaten (verarbeitet durch Stripe)</li>
              <li>Von Ihnen eingegebene Geschäftsdaten (Firmenkontakte, Notizen, Aufgaben)</li>
              <li>Nutzungsdaten und Logs (Login-Zeitstempel)</li>
            </ul>
            <p className="mt-2">Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">4. Zahlungsabwicklung – Stripe</h2>
            <p>
              Für die Zahlungsabwicklung nutzen wir den Dienst Stripe (Stripe, Inc., 510 Townsend Street, San Francisco, CA 94103, USA). Stripe verarbeitet Ihre Zahlungsdaten als eigenverantwortlicher Anbieter. Die Datenübertragung in die USA erfolgt auf Basis der Standardvertragsklauseln der EU-Kommission. Weitere Informationen:{" "}
              <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://stripe.com/de/privacy
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">5. Keine Weitergabe an Dritte</h2>
            <p>
              Ihre personenbezogenen Daten werden nicht an Dritte weitergegeben, außer wenn dies zur Vertragserfüllung notwendig ist (z. B. Stripe für die Zahlung) oder wenn wir gesetzlich dazu verpflichtet sind.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">6. Ihre Rechte</h2>
            <p>Sie haben jederzeit das Recht auf:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>Auskunft</strong> über Ihre gespeicherten personenbezogenen Daten (Art. 15 DSGVO)</li>
              <li><strong>Berichtigung</strong> unrichtiger Daten (Art. 16 DSGVO)</li>
              <li><strong>Löschung</strong> Ihrer Daten (Art. 17 DSGVO)</li>
              <li><strong>Einschränkung</strong> der Verarbeitung (Art. 18 DSGVO)</li>
              <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO)</li>
              <li><strong>Widerspruch</strong> gegen die Verarbeitung (Art. 21 DSGVO)</li>
            </ul>
            <p className="mt-2">
              Zur Ausübung Ihrer Rechte wenden Sie sich an: info@huwa-reinigung.de
              <br /><br />
              Sie haben außerdem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Die zuständige Behörde für Rheinland-Pfalz ist der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Rheinland-Pfalz.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">7. Cookies</h2>
            <p>
              Diese Website verwendet ausschließlich technisch notwendige Cookies (Session-Cookies für die Authentifizierung). Diese Cookies sind für den Betrieb der Website erforderlich und können nicht deaktiviert werden. Es werden keine Marketing- oder Tracking-Cookies gesetzt.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">8. Datensicherheit</h2>
            <p>
              Diese Website nutzt aus Sicherheitsgründen eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von „http://" auf „https://" wechselt.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">9. Speicherdauer</h2>
            <p>
              Ihre Daten werden gespeichert, solange Ihr Account aktiv ist. Nach Kündigung des Abonnements werden Ihre Daten innerhalb von 30 Tagen gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten bestehen (z. B. Steuerrecht: 10 Jahre für Rechnungsdaten).
            </p>
          </section>

          <p className="text-xs text-muted-foreground/60 pt-4 border-t border-border">Stand: April 2026</p>
        </div>
      </div>
    </div>
  );
}