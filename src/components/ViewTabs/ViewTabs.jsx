import { useNavigate } from 'react-router-dom'
import styles from './ViewTabs.module.css'

export default function ViewTabs({ active }) {
  const navigate = useNavigate()
  return (
    <div className={styles.tabs}>
      <button type="button" className={`${styles.tab} ${active === 'category' ? styles.active : ''}`} onClick={() => navigate('/budget')}>
        By Category
      </button>
      <button type="button" className={`${styles.tab} ${active === 'day' ? styles.active : ''}`} onClick={() => navigate('/itinerary')}>
        By Day
      </button>
    </div>
  )
}
