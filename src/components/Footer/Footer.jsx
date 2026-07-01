import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logoLink}>
          <img
            src="https://bestofthebay.net/wp-content/uploads/2026/03/BOTB.jpg"
            alt="BOTB"
            className={styles.logoImg}
          />
        </Link>

        <ul className={styles.socialLinks}>
          <li>
            <a
              href="https://t.me/BESTOFTHEBAYOG"
              className={styles.socialLink}
              target="_blank"
              rel="noreferrer"
              aria-label="Telegram"
            >
              <svg width="24" height="24" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                <path d="M28.97 63.32C47.63 55.2 60.07 49.84 66.29 47.25c17.77-7.39 21.47-8.68 23.87-8.72.53-.01 1.71.12 2.48.74.67.52.85 1.23.94 1.73.09.5.19 1.63.1 2.52-0.96 10.12-5.13 34.68-7.25 46.01-.9 4.8-2.66 6.4-4.37 6.56-3.72.34-6.54-2.46-10.14-4.82-5.63-3.69-8.81-5.99-14.28-9.59-6.32-4.16-2.22-6.45 1.38-10.19.95-.98 17.32-15.88 17.64-17.23.04-.17.07-.81-.3-1.14-.37-.33-.93-.22-1.33-.12-.56.13-9.56 6.07-26.99 17.84-2.55 1.75-4.86 2.61-6.93 2.56-2.28-.05-6.68-1.29-9.95-2.35-4.01-1.3-7.19-1.99-6.91-4.2.14-1.15 1.73-2.33 4.76-3.53z"/>
              </svg>
            </a>
          </li>
        </ul>
      </div>
    </footer>
  )
}
