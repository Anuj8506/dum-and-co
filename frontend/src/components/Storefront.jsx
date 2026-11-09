import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CookingPot,
  MapPin,
  ShoppingBag,
} from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { money } from '../utils/format';
import './storefront.css';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const collections = [
  {
    name: 'Biryani',
    image: 'biryani',
    description: 'Long-grain basmati, layered and slow-cooked.',
  },
  { name: 'Starters', image: 'chicken', description: 'A little heat to start the meal.' },
  { name: 'Desserts', image: 'dessert', description: 'Something sweet to finish.' },
];

export function StorefrontIntro({ onBrowse }) {
  return (
    <>
      <section className="taste-hero" aria-labelledby="storefront-heading">
        <img className="taste-hero-photo" src="/images/hero.jpg" alt="" fetchPriority="high" />
        <div className="taste-hero-content">
          <h1 id="storefront-heading" className="w-full max-w-5xl">
            Hyderabad,
            <br />
            served hot.
          </h1>
          <p>Slow-cooked biryani and Hyderabadi favourites, straight from your local kitchen.</p>
          <div className="taste-actions">
            <a href="#menu" className="taste-button taste-button-light">
              Explore the menu <ArrowDown size={17} />
            </a>
            <Link to="/party" className="taste-button taste-button-outline">
              Plan a party <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>
      </section>
      <section className="taste-chapter" aria-labelledby="collections-heading">
        <h2 id="collections-heading" className="taste-heading">
          What are you <span className="taste-inline-image" aria-hidden="true" /> craving?
        </h2>
        <div className="taste-collections grid-flow-dense">
          {collections.map(({ name, image, description }) => (
            <a key={name} href="#menu" className="taste-collection" onClick={() => onBrowse(name)}>
              <img src={`/images/${image}.jpg`} alt="" loading="lazy" />
              <div>
                <h3>{name}</h3>
                <p>{description}</p>
              </div>
              <ArrowUpRight className="taste-tile-arrow" size={21} aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

export function FeaturedDishes({ dishes, onSelect }) {
  const [index, setIndex] = useState(0);
  if (!dishes.length) return null;
  const active = index % dishes.length;
  const item = dishes[active];
  const step = (direction) =>
    setIndex((current) => (current + direction + dishes.length) % dishes.length);

  return (
    <section
      className="taste-chapter taste-feature"
      aria-label="House favourites"
      aria-roledescription="carousel"
    >
      <div className="taste-feature-photo">
        <img src={item.image} alt={item.name} loading="lazy" />
      </div>
      <div className="taste-feature-content" aria-live="polite">
        <p className="taste-feature-label">House favourites</p>
        <h2 className="taste-heading">{item.name}</h2>
        <p>{item.description}</p>
        <button
          type="button"
          className="taste-button taste-button-dark"
          onClick={() => onSelect(item)}
        >
          Choose options · {money(item.pricePaise)} <ArrowRight size={17} />
        </button>
        {dishes.length > 1 && (
          <div className="taste-carousel-controls">
            <button type="button" aria-label="Previous favourite" onClick={() => step(-1)}>
              <ArrowLeft size={19} />
            </button>
            <span>
              {active + 1} / {dishes.length}
            </span>
            <button type="button" aria-label="Next favourite" onClick={() => step(1)}>
              <ArrowRight size={19} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

const story = [
  {
    icon: MapPin,
    heading: 'Pick your kitchen',
    text: 'Select a nearby outlet to see its menu and availability.',
  },
  {
    icon: ShoppingBag,
    heading: 'Make it yours',
    text: 'Choose portions and add-ons, then review everything in your bag.',
  },
  {
    icon: CookingPot,
    heading: 'Follow your order',
    text: 'See your estimated preparation time and watch the status update as the kitchen works.',
  },
];
const storyTitle = 'From the handi to your home.';

export function OrderingStory() {
  const scope = useRef(null);
  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        const words = scope.current.querySelectorAll('.taste-story-word');
        gsap.from(words, {
          opacity: 0.25,
          stagger: 0.1,
          scrollTrigger: { trigger: scope.current, start: 'top 92%', end: 'top 58%', scrub: true },
        });
      });
      media.add('(min-width: 800px) and (prefers-reduced-motion: no-preference)', () => {
        const cards = [...scope.current.querySelectorAll('.taste-story-card')];
        cards.slice(0, -1).forEach((card, index) => {
          gsap.to(card, {
            scale: 0.94,
            ease: 'none',
            scrollTrigger: {
              trigger: cards[index + 1],
              start: 'top 68%',
              end: 'top 28%',
              scrub: true,
            },
          });
        });
      });
      return () => media.revert();
    },
    { scope }
  );

  return (
    <section className="taste-story taste-chapter" ref={scope} aria-labelledby="ordering-heading">
      <h2 id="ordering-heading" className="taste-heading" aria-label={storyTitle}>
        {storyTitle.split(' ').map((word) => (
          <span key={word} className="taste-story-word" aria-hidden="true">
            {word}{' '}
          </span>
        ))}
      </h2>
      <div className="taste-story-stack">
        {story.map(({ icon: Icon, heading, text }, index) => (
          <article
            key={heading}
            className="taste-story-card"
            style={{ '--stack-offset': `${index * 24}px` }}
          >
            <Icon size={31} strokeWidth={1.5} aria-hidden="true" />
            <div>
              <h3>{heading}</h3>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
