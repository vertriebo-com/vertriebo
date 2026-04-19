export default function AGB() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <a href="/landing" className="text-sm text-primary hover:underline mb-8 inline-block">← Zurück</a>
        <h1 className="text-3xl font-bold mb-8">Allgemeine Geschäftsbedingungen (AGB)</h1>

        <div className="space-y-6 text-sm text-muted-foreground">

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">§ 1 Geltungsbereich</h2>
            <p>Diese AGB gelten für alle Verträge zwischen Huwa Gebäudereinigung & Hausmeisterdienste (nachfolgend „Anbieter") und dem Kunden (nachfolgend „Nutzer") über die Nutzung der SaaS-Software „Huwa Vertrieb System".</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">§ 2 Vertragsgegenstand</h2>
            <p>Der Anbieter stellt dem Nutzer eine webbasierte CRM- und Vertriebssoftware als Software-as-a-Service (SaaS) zur Verfügung. Der Leistungsumfang richtet sich nach dem gewählten Abonnementplan (Starter, Team, Agentur).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">§ 3 Vertragsschluss</h2>
            <p>Der Vertrag kommt zustande durch Abschluss des Online-Checkouts und Bestätigung der Zahlung. Der Nutzer muss volljährig und geschäftsfähig sein. Die Nutzung erfolgt ausschließlich für gewerbliche Zwecke (B2B).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">§ 4 Preise und Zahlung</h2>
            <p>
              Die Preise richten sich nach dem gewählten Plan und sind Nettopreise zzgl. gesetzlicher MwSt. Die Abrechnung erfolgt monatlich im Voraus via Stripe. Bei Zahlungsverzug behält sich der Anbieter vor, den Zugang zu sperren.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">§ 5 Laufzeit und Kündigung</h2>
            <p>
              Der Vertrag läuft monatlich und ist jederzeit zum Ende des laufenden Abrechnungsmonats kündbar. Die Kündigung erfolgt durch den Nutzer direkt über das Kundenportal oder per E-Mail an info@huwa-gebaeudedienste.de. Bei Kündigung bleibt der Zugang bis zum Ende des bezahlten Zeitraums bestehen.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">§ 6 Nutzungsrechte</h2>
            <p>
              Der Anbieter gewährt dem Nutzer ein nicht übertragbares, nicht ausschließliches Recht zur Nutzung der Software für interne Geschäftszwecke. Eine Weitergabe, Unterlizenzierung oder ein Weiterverkauf ist nicht gestattet.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">§ 7 Verfügbarkeit</h2>
            <p>
              Der Anbieter strebt eine Verfügbarkeit von 99 % im Jahresmittel an, ausgenommen geplante Wartungsarbeiten. Ein Anspruch auf ununterbrochene Verfügbarkeit besteht nicht.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">§ 8 Pflichten des Nutzers</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Der Nutzer ist verantwortlich für die Rechtmäßigkeit der von ihm eingegebenen Daten</li>
              <li>Zugangsdaten sind vertraulich zu behandeln</li>
              <li>Die Software darf nicht für illegale Zwecke genutzt werden</li>
              <li>Bei Datenschutzverstößen ist der Anbieter unverzüglich zu informieren</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">§ 9 Datenschutz</h2>
            <p>
              Die Verarbeitung personenbezogener Daten erfolgt gemäß unserer Datenschutzerklärung und den Anforderungen der DSGVO. Der Anbieter handelt als Auftragsverarbeiter für die vom Nutzer eingegebenen Kundendaten. Auf Anfrage wird ein Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO abgeschlossen.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">§ 10 Haftungsbeschränkung</h2>
            <p>
              Der Anbieter haftet nur für Schäden, die auf vorsätzlichem oder grob fahrlässigem Verhalten beruhen. Die Haftung für einfache Fahrlässigkeit ist – soweit gesetzlich zulässig – auf den Jahresbetrag des Abonnements begrenzt.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">§ 11 Änderungen der AGB</h2>
            <p>
              Der Anbieter behält sich vor, diese AGB mit einer Frist von 30 Tagen zu ändern. Änderungen werden per E-Mail mitgeteilt. Widerspricht der Nutzer nicht innerhalb von 14 Tagen, gelten die Änderungen als angenommen.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground mb-2">§ 12 Anwendbares Recht und Gerichtsstand</h2>
            <p>
              Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand für Streitigkeiten mit Kaufleuten ist Neuwied, Deutschland.
            </p>
          </section>

          <p className="text-xs text-muted-foreground/60 pt-4 border-t border-border">Stand: April 2026</p>
        </div>
      </div>
    </div>
  );
}