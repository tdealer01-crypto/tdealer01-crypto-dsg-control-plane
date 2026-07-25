export default function DesignConstitutionPage() {
  return (
    <>
      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        :root {
          --deep-teal: #1a4d5c;
          --warm-gold: #b8860b;
          --soft-grey: #4a5568;
          --light-cream: #f5f1e8;
          --accent-coral: #c17a6f;
          --success-green: #4a7c5c;
          --base-unit: 16px;
          --golden-ratio: 1.618;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
          background-color: var(--light-cream);
          color: var(--soft-grey);
          line-height: 1.7;
          overflow-x: hidden;
        }

        /* Header */
        header {
          background: linear-gradient(135deg, var(--deep-teal) 0%, rgba(26, 77, 92, 0.95) 100%);
          color: white;
          padding: calc(var(--base-unit) * 3) var(--base-unit);
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(circle at 20% 50%, rgba(184, 134, 11, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(193, 122, 111, 0.1) 0%, transparent 50%);
          pointer-events: none;
        }

        h1 {
          font-size: 3.5rem;
          font-weight: 700;
          margin-bottom: var(--base-unit);
          letter-spacing: -1px;
          position: relative;
          z-index: 1;
        }

        .subtitle {
          font-size: 1.2rem;
          font-weight: 300;
          opacity: 0.95;
          max-width: 800px;
          margin: 0 auto;
        }

        /* Container */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 var(--base-unit);
        }

        /* Phases Grid */
        .phases-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
          gap: calc(var(--base-unit) * 2.618);
          padding: calc(var(--base-unit) * 3) 0;
        }

        .phase {
          background: white;
          border-left: 6px solid var(--warm-gold);
          padding: calc(var(--base-unit) * 1.618);
          border-radius: 4px;
          box-shadow: 0 4px 16px rgba(26, 77, 92, 0.08);
          transition: all 0.3s ease;
          animation: fadeIn 0.6s ease-out;
        }

        .phase:nth-child(1) { animation-delay: 0.1s; }
        .phase:nth-child(2) { animation-delay: 0.2s; }
        .phase:nth-child(3) { animation-delay: 0.3s; }
        .phase:nth-child(4) { animation-delay: 0.4s; }
        .phase:nth-child(5) { animation-delay: 0.5s; }
        .phase:nth-child(6) { animation-delay: 0.6s; }
        .phase:nth-child(7) { animation-delay: 0.7s; }
        .phase:nth-child(8) { animation-delay: 0.8s; }

        .phase:hover {
          box-shadow: 0 8px 32px rgba(26, 77, 92, 0.15);
          transform: translateY(-2px);
        }

        .phase-number {
          display: inline-flex;
          background: var(--deep-teal);
          color: white;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.2rem;
          margin-bottom: var(--base-unit);
        }

        .phase-title {
          font-size: 1.5rem;
          color: var(--deep-teal);
          font-weight: 700;
          margin-bottom: calc(var(--base-unit) * 0.5);
        }

        .phase-principle {
          font-size: 0.95rem;
          color: var(--soft-grey);
          line-height: 1.8;
          margin-bottom: var(--base-unit);
          padding-bottom: var(--base-unit);
          border-bottom: 1px solid rgba(74, 85, 104, 0.1);
        }

        .phase-benefits {
          list-style: none;
          font-size: 0.9rem;
        }

        .phase-benefits li {
          padding-left: 24px;
          margin-bottom: 8px;
          position: relative;
          color: var(--soft-grey);
        }

        .phase-benefits li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: var(--success-green);
          font-weight: bold;
        }

        /* North Star Section */
        .north-star {
          background: linear-gradient(135deg, var(--deep-teal) 0%, rgba(26, 77, 92, 0.9) 100%);
          color: white;
          padding: calc(var(--base-unit) * 3);
          border-radius: 8px;
          text-align: center;
          margin: calc(var(--base-unit) * 3) 0;
          box-shadow: 0 8px 32px rgba(26, 77, 92, 0.2);
        }

        .north-star h2 {
          font-size: 2rem;
          margin-bottom: var(--base-unit);
          font-weight: 700;
        }

        .north-star p {
          font-size: 1.1rem;
          line-height: 1.8;
          opacity: 0.95;
        }

        /* Color Palette */
        .palette {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: var(--base-unit);
          margin: calc(var(--base-unit) * 2) 0;
        }

        .color-swatch {
          border-radius: 8px;
          padding: var(--base-unit);
          text-align: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          color: white;
          font-weight: 600;
        }

        .teal { background-color: var(--deep-teal); }
        .gold { background-color: var(--warm-gold); color: white; }
        .grey { background-color: var(--soft-grey); }
        .cream { background-color: var(--light-cream); color: var(--deep-teal); border: 1px solid #ddd; }
        .coral { background-color: var(--accent-coral); }
        .green { background-color: var(--success-green); }

        /* Footer */
        footer {
          background: var(--deep-teal);
          color: white;
          text-align: center;
          padding: calc(var(--base-unit) * 2);
          margin-top: calc(var(--base-unit) * 4);
        }

        footer p {
          opacity: 0.9;
          font-size: 0.95rem;
        }

        /* Section headings */
        .section-title {
          color: var(--deep-teal);
          font-size: 2rem;
          margin: calc(var(--base-unit) * 3) 0 var(--base-unit);
          text-align: center;
          font-weight: 700;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .phases-grid {
            grid-template-columns: 1fr;
          }

          h1 {
            font-size: 2.5rem;
          }

          .palette {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Animations */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .summary-text {
          font-size: 1.1rem;
          color: var(--soft-grey);
          max-width: 800px;
          margin: 0 auto;
          line-height: 1.8;
          text-align: center;
        }
      `}</style>

      <header>
        <h1>Design Constitution</h1>
        <p className="subtitle">for DSG ONE • Phases 21–28 • Harmonic Integration</p>
      </header>

      <div className="container">
        {/* Color Palette */}
        <section style={{ marginTop: 'calc(var(--base-unit) * 3)' }}>
          <h2 className="section-title">Harmonic Integration Palette</h2>
          <div className="palette">
            <div className="color-swatch teal">Deep Teal<br />#1a4d5c</div>
            <div className="color-swatch gold">Warm Gold<br />#b8860b</div>
            <div className="color-swatch grey">Soft Grey<br />#4a5568</div>
            <div className="color-swatch cream">Light Cream<br />#f5f1e8</div>
            <div className="color-swatch coral">Accent Coral<br />#c17a6f</div>
            <div className="color-swatch green">Success Green<br />#4a7c5c</div>
          </div>
        </section>

        {/* Phases */}
        <section>
          <h2 className="section-title">8 Design Principles</h2>

          <div className="phases-grid">
            <div className="phase">
              <div className="phase-number">21</div>
              <h3 className="phase-title">Truth Before Beauty</h3>
              <p className="phase-principle">Beauty must serve clarity. Show policy, evidence, and audit ID.</p>
              <ul className="phase-benefits">
                <li>Evidence hierarchy visible</li>
                <li>Relationships shown</li>
                <li>Audit trail accessible</li>
              </ul>
            </div>

            <div className="phase">
              <div className="phase-number">22</div>
              <h3 className="phase-title">Visual Ethics</h3>
              <p className="phase-principle">Colors and emphasis reflect actual importance, not persuasion.</p>
              <ul className="phase-benefits">
                <li>Proportional colors</li>
                <li>Equal visual weight</li>
                <li>Reversible choices</li>
              </ul>
            </div>

            <div className="phase">
              <div className="phase-number">23</div>
              <h3 className="phase-title">The Living Grid</h3>
              <p className="phase-principle">Golden-ratio proportions enable scalable, harmonious growth.</p>
              <ul className="phase-benefits">
                <li>61.8% / 38.2% balance</li>
                <li>Breathing room</li>
                <li>Responsive scaling</li>
              </ul>
            </div>

            <div className="phase">
              <div className="phase-number">24</div>
              <h3 className="phase-title">Interaction Charter</h3>
              <p className="phase-principle">Intent → Action → Feedback → Result: predictable, confirmed.</p>
              <ul className="phase-benefits">
                <li>Clear intent</li>
                <li>Immediate feedback</li>
                <li>Error explanations</li>
              </ul>
            </div>

            <div className="phase">
              <div className="phase-number">25</div>
              <h3 className="phase-title">Identity Beyond Logo</h3>
              <p className="phase-principle">Brand is felt through tone, patterns, and honest behavior.</p>
              <ul className="phase-benefits">
                <li>Consistent tone</li>
                <li>Repeating patterns</li>
                <li>Behavioral integrity</li>
              </ul>
            </div>

            <div className="phase">
              <div className="phase-number">26</div>
              <h3 className="phase-title">Evolution Strategy</h3>
              <p className="phase-principle">Systems grow without losing identity through harmonic addition.</p>
              <ul className="phase-benefits">
                <li>Metric classification</li>
                <li>Phased rollout</li>
                <li>Policy evolution</li>
              </ul>
            </div>

            <div className="phase">
              <div className="phase-number">27</div>
              <h3 className="phase-title">Ultimate Experience</h3>
              <p className="phase-principle">Users feel empowered: understanding, trust, focus, naturalness.</p>
              <ul className="phase-benefits">
                <li>Quick onboarding</li>
                <li>System transparency</li>
                <li>Minimal friction</li>
              </ul>
            </div>

            <div className="phase">
              <div className="phase-number">28</div>
              <h3 className="phase-title">Design North Star</h3>
              <p className="phase-principle">Unified principle: Design for Trust Through Clarity.</p>
              <ul className="phase-benefits">
                <li>Resolves conflicts</li>
                <li>Scoring rubric</li>
                <li>Decision framework</li>
              </ul>
            </div>
          </div>
        </section>

        {/* North Star */}
        <div className="north-star">
          <h2>✨ Design North Star</h2>
          <p>Every design decision must ask:<br /><strong>Does this choice make the system more trustworthy,<br />more transparent, or more understandable?</strong></p>
        </div>

        {/* Summary */}
        <section style={{ textAlign: 'center', padding: 'calc(var(--base-unit) * 2) 0' }}>
          <h2 className="section-title">Harmonic Integration in Practice</h2>
          <p className="summary-text">
            The Design Constitution is a commitment to orchestrated simplicity. Every principle ensures that revenue, sales, and performance integrate harmoniously—through transparency, trust, and minimal governance. Systems flourish not through surveillance and control, but through clarity and collaboration.
          </p>
        </section>
      </div>

      <footer>
        <p><strong>Design Constitution v1.0</strong> • Status: Philosophy & Implementation Ready</p>
        <p style={{ marginTop: '8px', opacity: '0.8' }}>Created: 2026-07-25 • Alignment: Harmonic Integration Philosophy ✓</p>
      </footer>
    </>
  );
}
