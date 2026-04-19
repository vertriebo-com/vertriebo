export default function Impressum() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <a href="/landing" className="text-sm text-primary hover:underline mb-8 inline-block">← Zurück</a>
        <h1 className="text-3xl font-bold mb-8">Impressum</h1>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground">
          <section>
            <h2 className="text-lg font-semibold mb-2">Angaben gemäß § 5 TMG</h2>
            <p className="text-muted-foreground">
              Huwa Gebäudereinigung & Hausmeisterdienste<br />
              Mittelweg 24<br />
              56566 Neuwied<br />
              Deutschland
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Kontakt</h2>
            <p className="text-muted-foreground">
              Telefon: 02601/9131820<br />
              E-Mail: info@huwa-reinigung.de
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Umsatzsteuer-ID</h2>
            <p className="text-muted-foreground">
              Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:<br />
              Wird nach Beantragung ergänzt.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
            <p className="text-muted-foreground">
              Huwa Gebäudereinigung & Hausmeisterdienste<br />
              Mittelweg 24<br />
              56566 Neuwied
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Streitschlichtung</h2>
            <p className="text-muted-foreground">
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://ec.europa.eu/consumers/odr/
              </a>
              <br />
              Unsere E-Mail-Adresse finden Sie oben im Impressum.
              <br /><br />
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Haftung für Inhalte</h2>
            <p className="text-muted-foreground">
              Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Haftung für Links</h2>
            <p className="text-muted-foreground">
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Urheberrecht</h2>
            <p className="text-muted-foreground">
              Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}