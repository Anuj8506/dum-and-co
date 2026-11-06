import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { menuService } from '../services/menuService';
import { useApp } from '../utils/AppContext';
import { money } from '../utils/format';
import { Loading, ErrorState } from '../components/States';
import WorkspaceModal from '../components/WorkspaceModal';
const blank = {
  name: '',
  description: '',
  category: 'Biryani',
  image: '/images/biryani.jpg',
  vegetarian: false,
  spice: 'Medium',
  allergens: [],
  badge: '',
  prepMinutes: 20,
  pricePaise: 25000,
  cityPrices: {},
  portions: [{ name: 'Regular', multiplier: 1 }],
  addons: [],
  active: true,
  availableFrom: 0,
  availableUntil: 24,
};
export default function AdminMenuPage() {
  const { notify, refreshMenu } = useApp();
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [editing, setEditing] = useState(null),
    [form, setForm] = useState(blank),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState('');
  const [allergensText, setAllergensText] = useState('');
  const load = useCallback(
    () =>
      menuService
        .admin()
        .then((d) => {
          setData(d);
          setError('');
        })
        .catch((e) => setError(e.message)),
    []
  );
  useEffect(() => {
    load();
  }, [load]);
  const edit = (item) => {
    setEditing(item?._id || 'new');
    setAllergensText(item?.allergens.join(', ') || '');
    setForm(
      item
        ? Object.fromEntries(Object.keys(blank).map((k) => [k, item[k] ?? blank[k]]))
        : { ...blank }
    );
    setFormError('');
  };
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      await menuService.save(editing === 'new' ? null : editing, {
        ...form,
        allergens: allergensText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setEditing(null);
      await load();
      refreshMenu();
      notify('Menu saved across all kitchens.');
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="workspace">
      <div className="workspace-top">
        <div>
          <div className="eyebrow">ONE MENU. EVERY KITCHEN.</div>
          <h1>Keep it fresh.</h1>
          <p className="muted">Manage dishes, prices, portions and time-based menus.</p>
        </div>
        <div className="workspace-actions">
          <Link className="button secondary" to="/admin/dashboard">
            Overview
          </Link>
          <button className="button" onClick={() => edit(null)}>
            <Plus size={17} /> Add a dish
          </button>
        </div>
      </div>
      {error ? (
        <ErrorState message={error} retry={load} />
      ) : !data ? (
        <Loading />
      ) : (
        <div className="panel table-panel">
          <table className="menu-table">
            <thead>
              <tr>
                <th>Dish</th>
                <th>Category</th>
                <th>Price incl. GST</th>
                <th>Hours (IST)</th>
                <th>Visibility</th>
                <th>Edit</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item._id}>
                  <td>
                    <div className="table-dish">
                      <img src={item.image} alt="" />
                      <span>
                        <b>{item.name}</b>
                        <small>
                          {item.vegetarian ? 'Vegetarian' : 'Non-vegetarian'} · {item.spice}
                        </small>
                      </span>
                    </div>
                  </td>
                  <td>{item.category}</td>
                  <td>{money(item.pricePaise)}</td>
                  <td>
                    {item.availableFrom}:00–{item.availableUntil}:00
                  </td>
                  <td>
                    <span className={`status-badge ${item.active ? 'ready' : 'cancelled'}`}>
                      {item.active ? 'Published' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`Edit ${item.name}`}
                      onClick={() => edit(item)}
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <WorkspaceModal onClose={() => setEditing(null)} labelledBy="edit-title">
          <section className="panel menu-editor">
            <div className="editor-heading">
              <h2 id="edit-title">
                {editing === 'new' ? 'A new favourite.' : 'The recipe for a good menu.'}
              </h2>
              <button
                className="icon-button"
                aria-label="Close editor"
                onClick={() => setEditing(null)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={save}>
              <div className="form-grid">
                <label>
                  Dish name
                  <input
                    required
                    maxLength={100}
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                  />
                </label>
                <label>
                  Category
                  <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                    {['Biryani', 'Starters', 'Curries & sides', 'Desserts', 'Drinks'].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="span-two">
                  Description
                  <textarea
                    required
                    maxLength={400}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                  />
                </label>
                <label>
                  Price (₹, includes GST)
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={form.pricePaise / 100}
                    onChange={(e) => set('pricePaise', Math.round(Number(e.target.value) * 100))}
                  />
                </label>
                <label>
                  Prep time (minutes)
                  <input
                    type="number"
                    min="2"
                    max="90"
                    required
                    value={form.prepMinutes}
                    onChange={(e) => set('prepMinutes', Number(e.target.value))}
                  />
                </label>
                <label>
                  Photo
                  <select value={form.image} onChange={(e) => set('image', e.target.value)}>
                    {[
                      'biryani',
                      'mutton',
                      'veg',
                      'chicken',
                      'paneer',
                      'curry',
                      'dessert',
                      'lassi',
                    ].map((s) => (
                      <option key={s} value={`/images/${s}.jpg`}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Spice level
                  <select value={form.spice} onChange={(e) => set('spice', e.target.value)}>
                    {['Mild', 'Medium', 'Hot'].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Available from (0–23)
                  <input
                    type="number"
                    min="0"
                    max="23"
                    required
                    value={form.availableFrom}
                    onChange={(e) => set('availableFrom', Number(e.target.value))}
                  />
                </label>
                <label>
                  Available until (1–24)
                  <input
                    type="number"
                    min="1"
                    max="24"
                    required
                    value={form.availableUntil}
                    onChange={(e) => set('availableUntil', Number(e.target.value))}
                  />
                </label>
                <label>
                  Allergens (comma separated)
                  <input value={allergensText} onChange={(e) => setAllergensText(e.target.value)} />
                </label>
                <label>
                  Badge
                  <input
                    maxLength={40}
                    value={form.badge}
                    onChange={(e) => set('badge', e.target.value)}
                  />
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.vegetarian}
                    onChange={(e) => set('vegetarian', e.target.checked)}
                  />
                  Vegetarian
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => set('active', e.target.checked)}
                  />
                  Publish dish
                </label>
              </div>
              <fieldset>
                <legend>Portions</legend>
                {form.portions.map((p, i) => (
                  <div className="inline-fields" key={i}>
                    <input
                      aria-label={`Portion ${i + 1} name`}
                      required
                      value={p.name}
                      onChange={(e) =>
                        set(
                          'portions',
                          form.portions.map((a, j) =>
                            i === j ? { ...a, name: e.target.value } : a
                          )
                        )
                      }
                    />
                    <input
                      aria-label={`Portion ${i + 1} price multiplier`}
                      required
                      type="number"
                      min="0.5"
                      max="10"
                      step="0.1"
                      value={p.multiplier}
                      onChange={(e) =>
                        set(
                          'portions',
                          form.portions.map((a, j) =>
                            i === j ? { ...a, multiplier: Number(e.target.value) } : a
                          )
                        )
                      }
                    />
                    <button
                      className="text-button"
                      type="button"
                      disabled={form.portions.length === 1}
                      onClick={() =>
                        set(
                          'portions',
                          form.portions.filter((_, j) => j !== i)
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    set('portions', [...form.portions, { name: 'Family pack', multiplier: 2.5 }])
                  }
                >
                  + Add portion
                </button>
              </fieldset>
              <fieldset>
                <legend>Add-ons</legend>
                {form.addons.map((a, i) => (
                  <div className="inline-fields" key={i}>
                    <input
                      aria-label={`Add-on ${i + 1} name`}
                      required
                      value={a.name}
                      onChange={(e) =>
                        set(
                          'addons',
                          form.addons.map((v, j) => (i === j ? { ...v, name: e.target.value } : v))
                        )
                      }
                    />
                    <input
                      aria-label={`Add-on ${i + 1} price in rupees`}
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={a.pricePaise / 100}
                      onChange={(e) =>
                        set(
                          'addons',
                          form.addons.map((v, j) =>
                            i === j
                              ? { ...v, pricePaise: Math.round(Number(e.target.value) * 100) }
                              : v
                          )
                        )
                      }
                    />
                    <button
                      type="button"
                      className="text-button"
                      onClick={() =>
                        set(
                          'addons',
                          form.addons.filter((_, j) => j !== i)
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => set('addons', [...form.addons, { name: '', pricePaise: 3000 }])}
                >
                  + Add extra
                </button>
              </fieldset>
              <fieldset>
                <legend>City price override (₹)</legend>
                <label>
                  Hyderabad — leave empty for base price
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={
                      form.cityPrices.Hyderabad === undefined ? '' : form.cityPrices.Hyderabad / 100
                    }
                    onChange={(e) =>
                      set(
                        'cityPrices',
                        e.target.value === ''
                          ? {}
                          : { Hyderabad: Math.round(Number(e.target.value) * 100) }
                      )
                    }
                  />
                </label>
              </fieldset>
              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}
              <div className="form-actions">
                <button className="button secondary" type="button" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button className="button" disabled={busy}>
                  {busy ? 'Saving…' : 'Save menu item'}
                </button>
              </div>
            </form>
          </section>
        </WorkspaceModal>
      )}
    </main>
  );
}
