import { CookingPot } from 'lucide-react';
export default function Footer() {
  return (
    <footer>
      <div className="footer-inner">
        <div>
          <span className="footer-brand">
            <CookingPot size={22} /> Dum & Co.
          </span>
          <p>Made slowly. Served wholeheartedly.</p>
        </div>
        <div>
          <p>Hyderabad, with love.</p>
          <small>Demonstration restaurant · Synthetic data · Simulated payments</small>
          <br />
          <small>All menu prices include 5% GST. Please review allergens before ordering.</small>
        </div>
      </div>
    </footer>
  );
}
