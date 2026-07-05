import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

function TelegramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 128 128" aria-hidden="true" fill="currentColor">
      <path d="M28.97 63.32C47.63 55.2 60.07 49.84 66.29 47.25c17.77-7.39 21.47-8.68 23.87-8.72.53-.01 1.71.12 2.48.74.67.52.85 1.23.94 1.73.09.5.19 1.63.1 2.52-0.96 10.12-5.13 34.68-7.25 46.01-.9 4.8-2.66 6.4-4.37 6.56-3.72.34-6.54-2.46-10.14-4.82-5.63-3.69-8.81-5.99-14.28-9.59-6.32-4.16-2.22-6.45 1.38-10.19.95-.98 17.32-15.88 17.64-17.23.04-.17.07-.81-.3-1.14-.37-.33-.93-.22-1.33-.12-.56.13-9.56 6.07-26.99 17.84-2.55 1.75-4.86 2.61-6.93 2.56-2.28-.05-6.68-1.29-9.95-2.35-4.01-1.3-7.19-1.99-6.91-4.2.14-1.15 1.73-2.33 4.76-3.53z"/>
    </svg>
  )
}

function SignalIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 1.5C6.201 1.5 1.5 5.696 1.5 10.875c0 2.788 1.397 5.284 3.594 6.987L3.75 22.5l5.484-2.447A11.45 11.45 0 0 0 12 20.25c5.799 0 10.5-4.196 10.5-9.375S17.799 1.5 12 1.5z"/>
    </svg>
  )
}

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.grid}>

          {/* Brand */}
          <div className={styles.brand}>
            <Link to="/" className={styles.logoLink}>
              <img
                src="https://bestofthebay.net/wp-content/uploads/2026/03/BOTB.jpg"
                alt="BOTB"
                className={styles.logoImg}
              />
            </Link>
            <p className={styles.tagline}>Premium products, trusted community.</p>
            <div className={styles.socials}>
              <a
                href="https://t.me/BESTOFTHEBAYOGDM"
                className={`${styles.socialBtn} ${styles.tg}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Contact on Telegram"
                title="Telegram"
              >
                <TelegramIcon />
              </a>
              <a
                href="https://signal.me/#eu/GvtI_xbtlVnWQt5Edv6s9dZpfzwKKg3DBrB75lAg0cm77xCeHOlAqI8hBcjaO9pj"
                className={`${styles.socialBtn} ${styles.sg}`}
                target="_blank"
                rel="noreferrer"
                aria-label="Contact on Signal"
                title="Signal"
              >
                <SignalIcon />
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div className={styles.col}>
            <h4 className={styles.colTitle}>Quick Links</h4>
            <ul className={styles.colList}>
              <li><Link to="/" className={styles.colLink}>Home</Link></li>
              <li><Link to="/shop" className={styles.colLink}>Shop</Link></li>
              <li><Link to="/wallet" className={styles.colLink}>Wallet</Link></li>
              <li><Link to="/cart" className={styles.colLink}>Cart</Link></li>
              <li><Link to="/support" className={styles.colLink}>Support</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className={styles.col}>
            <h4 className={styles.colTitle}>Contact Us</h4>
            <ul className={styles.colList}>
              <li>
                <a
                  href="https://t.me/BESTOFTHEBAYOGDM"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.colLink}
                >
                  Telegram DM
                </a>
              </li>
              <li>
                <a
                  href="https://signal.me/#eu/GvtI_xbtlVnWQt5Edv6s9dZpfzwKKg3DBrB75lAg0cm77xCeHOlAqI8hBcjaO9pj"
                  target="_blank"
                  rel="noreferrer"
                  className={styles.colLink}
                >
                  Signal
                </a>
              </li>
              <li>
                <Link to="/support" className={styles.colLink}>Support Ticket</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copy}>© {new Date().getFullYear()} BESTOFTHEBAY · All rights reserved.</p>
          <p className={styles.disclaimer}>All sales are final. Use of this platform implies acceptance of our terms.</p>
        </div>
      </div>
    </footer>
  )
}
