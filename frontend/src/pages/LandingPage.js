import { Link } from "react-router-dom";

export default function LandingPage() {
    return (
        <div className="landing-wrapper">
            {/* NAV */}
            <nav className="landing-nav">
                <Link to="/" className="landing-nav-logo">
                    <div className="landing-nav-logo-icon">🫀</div>
                    <span className="landing-nav-logo-text">StethAI</span>
                </Link>
                <div className="landing-nav-actions">
                    <Link to="/login" className="btn btn-outline" id="nav-login-btn">Login</Link>
                    <Link to="/signup" className="btn btn-primary" id="nav-signup-btn">Get Started</Link>
                </div>
            </nav>

            {/* HERO */}
            <section className="landing-hero">
                <div className="landing-hero-eyebrow">
                    <span>🔬</span> AI-Powered Cardiac Screening
                </div>
                <h1 className="landing-hero-title">
                    Smart Digital Stethoscope<br />
                    <span className="gradient-text">Powered by Deep Learning</span>
                </h1>
                <p className="landing-hero-subtitle">
                    StethAI combines phonocardiogram analysis with IoT physiological sensing to detect
                    cardiac anomalies in real time — from anywhere in the world.
                </p>
                <div className="landing-hero-actions">
                    <Link to="/signup" className="btn btn-primary btn-lg" id="hero-signup-btn">
                        🩺 Start Monitoring
                    </Link>
                    <Link to="/login" className="btn btn-outline btn-lg" id="hero-login-btn">
                        Sign In
                    </Link>
                </div>

                {/* ECG VISUAL */}
                <div className="ecg-container" style={{ marginTop: '60px' }}>
                    <div className="ecg-icon">❤️</div>
                    <div className="ecg-line">
                        <svg className="ecg-svg" viewBox="0 0 400 60" fill="none">
                            <path
                                className="ecg-path"
                                d="M0,30 L60,30 L70,30 L80,8 L90,52 L100,15 L110,45 L120,30 L180,30 L190,30 L200,8 L210,52 L220,15 L230,45 L240,30 L300,30 L310,30 L320,8 L330,52 L340,15 L350,45 L360,30 L400,30"
                                stroke="#00c6ff"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                            />
                        </svg>
                    </div>
                    <div className="ecg-stats">
                        <div className="ecg-stat-val">72</div>
                        <div className="ecg-stat-lbl">BPM</div>
                        <div style={{ marginTop: '6px' }}>
                            <span className="badge badge-normal">Normal</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className="landing-features">
                <div className="landing-features-header">
                    <h2 className="landing-features-title">
                        Everything you need for cardiac care
                    </h2>
                    <p className="landing-features-subtitle">
                        A complete multimodal platform combining AI and IoT sensors.
                    </p>
                </div>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-card-icon feature-card-icon-blue">🎙️</div>
                        <h3 className="feature-card-title">Heart Sound Analysis</h3>
                        <p className="feature-card-desc">
                            Deep learning model trained on PhysioNet 2016 detects murmurs and anomalies
                            from PCG recordings with MFCC feature extraction via Librosa.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-card-icon feature-card-icon-green">🩸</div>
                        <h3 className="feature-card-title">SpO₂ & Pulse Monitoring</h3>
                        <p className="feature-card-desc">
                            MAX30102 sensor via ESP32 delivers real-time blood oxygen saturation and pulse
                            rate readings fused with AI diagnosis.
                        </p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-card-icon feature-card-icon-purple">🏥</div>
                        <h3 className="feature-card-title">Remote Doctor Access</h3>
                        <p className="feature-card-desc">
                            Role-based dashboards let doctors review all patient reports, monitor historical
                            trends, and support remote clinical decisions.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="landing-cta">
                <h2 className="landing-cta-title">Ready to monitor your heart?</h2>
                <p className="landing-cta-subtitle">
                    Create a free account and start your first cardiac screening in minutes.
                </p>
                <Link to="/signup" className="btn btn-primary btn-lg" id="cta-signup-btn">
                    Create Free Account →
                </Link>
            </section>
        </div>
    );
}
