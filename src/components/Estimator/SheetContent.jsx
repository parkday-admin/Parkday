import styles from './Estimator.module.css'

export function ResortSheet() {
  return (
    <>
      <div className={styles.siCard}><div className={styles.siName}>Value</div><div className={styles.siPrice}>$130–$280/night</div><div className={styles.siDesc}>All-Star Movies/Music/Sports, Pop Century, Art of Animation. Compact rooms, food-court dining, bus or skyliner transport to parks. <br /><strong>Best for:</strong> budget-conscious families and anyone who'll spend most waking hours in the parks anyway.</div></div>
      <div className={styles.siCard}><div className={styles.siName}>Moderate</div><div className={styles.siPrice}>$220–$450/night</div><div className={styles.siDesc}>Caribbean Beach, Port Orleans (Riverside & French Quarter), Coronado Springs. Themed grounds, larger pools with slides, a table-service option on-site. <br /><strong>Best for:</strong> families who want more atmosphere and room without deluxe pricing.</div></div>
      <div className={styles.siCard}><div className={styles.siName}>Deluxe</div><div className={styles.siPrice}>$430–$1,100/night</div><div className={styles.siDesc}>Grand Floridian, Polynesian, Contemporary, Wilderness Lodge, Animal Kingdom Lodge, BoardWalk, Yacht & Beach Club. Walking, monorail, or boat access to a park, full-service dining, larger rooms. <strong>Best for:</strong> guests who want the resort itself to be part of the vacation, or easy access back for midday breaks.</div></div>
      <div className={styles.siCard}><div className={styles.siName}>Deluxe Villa</div><div className={styles.siPrice}>$500–$1,350/night</div><div className={styles.siDesc}>Bay Lake Tower, Boulder Ridge & Copper Creek Villas, Old Key West, Saratoga Springs. DVC studios and 1–3BR villas with kitchens or kitchenettes and laundry. <strong>Best for:</strong> larger or multi-generational groups, and longer stays where cooking some meals offsets the nightly rate.</div></div>
      <div className={styles.siCard}><div className={styles.siName}>Off Property</div><div className={styles.siPrice}>$100–$250/night</div><div className={styles.siDesc}>Swan/Dolphin, Bonnet Creek, Disney Springs-area hotels, and other offsite options. No Disney transportation and no early theme park entry at most (Swan/Dolphin is an exception). Usually means a rental car. <strong>Best for:</strong> budget travelers comfortable driving and parking themselves.</div></div>
    </>
  )
}

export function TicketSheet() {
  return (
    <>
      <div className={styles.siCard}><div className={styles.siName}>Base</div><div className={styles.siPrice}>No add-on cost</div><div className={styles.siDesc}>One park per day, no switching. <strong>Makes sense when:</strong> you're following a clear one-park-a-day plan, especially for first-time visitors — it's the easiest to plan around and the cheapest.</div></div>
      <div className={styles.siCard}><div className={styles.siName}>Water Park & Sports</div><div className={styles.siPrice}>+$74–$80/pp/day</div><div className={styles.siDesc}>Base access plus entry to the water parks, Oak Trail golf, and ESPN Wide World of Sports. <strong>Makes sense when:</strong> your trip includes a water park day and you don't otherwise need to hop between theme parks.</div></div>
      <div className={styles.siCard}><div className={styles.siName}>Park Hopper</div><div className={styles.siPrice}>+$80–$100/day</div><div className={styles.siDesc}>Visit more than one theme park in the same day. <strong>2pm restriction:</strong> on most days you can't enter your second park until 2:00pm, which limits same-day hopping to evenings. <strong>Makes sense when:</strong> you want to catch fireworks at a different park than you spent the day in, or have a dining reservation elsewhere in the evening — less useful if you're not actually planning to move around.</div></div>
      <div className={styles.siCard}><div className={styles.siName}>Hopper Plus</div><div className={styles.siPrice}>+$100–$130/day</div><div className={styles.siDesc}>Park Hopper plus Water Park & Sports access. <strong>Makes sense when:</strong> you want maximum flexibility on a longer trip — otherwise it's usually more add-on than most trips need.</div></div>
    </>
  )
}

export function LightningLaneSheet() {
  return (
    <>
      <div className={styles.siDesc} style={{ marginBottom: 12 }}>Lightning Lane is Disney's paid line-skipping system — you book a return window for an attraction and use a shorter queue instead of standby.</div>
      <div className={styles.siCard}><div className={styles.siName}>Multi Pass</div><div className={styles.siPrice}>~$15–$25/pp/day</div><div className={styles.siDesc}>Book a handful of participating attractions per park per day, then re-book more once you've used your selections — similar to the old free FastPass+, but paid. Pricing varies by date and demand.</div></div>
      <div className={styles.siCard}><div className={styles.siName}>MP + Singles</div><div className={styles.siPrice}>~$55–$90/pp/day</div><div className={styles.siDesc}>Multi Pass plus Individual Lightning Lane purchases for the highest-demand headliners (Tron, Guardians of the Galaxy: Cosmic Rewind, Rise of the Resistance, etc.), bought separately per ride, per person.</div></div>
      <div className={styles.siCard}><div className={styles.siName}>Premier Pass</div><div className={styles.siPrice}>~$449–$589/pp/day</div><div className={styles.siDesc}>A single flat rate per person, per day, per park, for unlimited same-day Lightning Lane access to every eligible attraction — no per-ride booking or extra purchases. Priced by date and demand, and it isn't sold every day. Only available at Magic Kingdom, EPCOT, Hollywood Studios, and Animal Kingdom individually — one pass doesn't cover multiple parks in a day even with Park Hopper.</div></div>
      <div className={styles.siNote}><strong>Honest take:</strong> Multi Pass is worth it for families with young kids who tire of long waits, or anyone visiting during summer/holiday crowd levels. If you're traveling value season with a party willing to rope-drop and use standby strategically, you can often skip it. Singles are usually only worth it for 1–2 must-do headliners rather than buying them for every ride. Premier Pass only pencils out for a short, high-intensity visit where time matters more than money — for most multi-day trips, MP + Singles covers the same headliners for a fraction of the cost.</div>
    </>
  )
}

export function DiningSheet() {
  return (
    <>
      <div className={styles.siSub}>Quick Service</div>
      <div className={styles.siCard}><div className={styles.siDesc}>Order at a counter or on the app, no reservation needed, food arrives fast. Examples: Docking Bay 7, Satu'li Canteen, Columbia Harbour House, Woody's Lunch Box.</div></div>
      <div className={styles.siSub}>Table Service</div>
      <div className={styles.siCard}><div className={styles.siDesc}>Sit-down restaurants with table service. Reservations open 60 days before your check-in date and popular spots fill up fast — book early. Examples: Be Our Guest, Sci-Fi Dine-In Theater, Skipper Canteen.</div></div>
      <div className={styles.siSub}>Character Dining</div>
      <div className={styles.siCard}><div className={styles.siDesc}>A table-service meal with costumed characters visiting your table for photos and autographs. Families love it because it guarantees character interactions without waiting in a meet-and-greet line. Comes at a price premium — typically $60–$95/person versus $45–$75 for standard table service. Examples: Chef Mickey's, Cinderella's Royal Table, Topolino's Terrace.</div></div>
      <div className={styles.siSub}>Dining plans</div>
      <div className={styles.siNote}>Disney sells prepaid dining plans — roughly Quick-Service ($57 adult / $23 child per night), Dining ($94 / $30), and Deluxe Dining ($119 / $48) — that bundle a set number of meals and snacks per resort night. Whether one saves you money depends on how many table-service and character meals you're already planning and how big your appetite is; it's worth comparing the plan cost against paying out of pocket before you book.</div>
    </>
  )
}
