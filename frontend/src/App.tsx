import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowUpRight, ImagePlus, Plus, X, LockKeyhole, Trash2, LoaderCircle, Sparkles } from 'lucide-react'
import { api, imageSrc, type Collectible } from './api'

type Modal = 'add' | 'detail' | null

function App() {
  const [items, setItems] = useState<Collectible[]>([])
  const [selected, setSelected] = useState<Collectible | null>(null)
  const [modal, setModal] = useState<Modal>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [adminToken, setAdminToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      setItems(await api.list())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the collection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  useEffect(() => {
    if (!image) { setPreview(''); return }
    const url = URL.createObjectURL(image)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  function openAdd() {
    setTitle('')
    setDescription('')
    setImage(null)
    setPreview('')
    setError('')
    setModal('add')
  }

  async function openDetail(item: Collectible) {
    setSelected(item)
    setModal('detail')
    try {
      setSelected(await api.get(item.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this story.')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!image) { setError('Choose a photo first.'); return }
    if (!adminToken.trim()) { setShowToken(true); setError('Enter your owner token to add a collectible.'); return }
    const form = new FormData()
    form.append('title', title.trim())
    form.append('description', description.trim())
    form.append('image', image)
    setSaving(true)
    setError('')
    try {
      const created = await api.create(form, adminToken.trim())
      setItems(current => [created, ...current])
      setSelected(created)
      setModal('detail')
      setTitle('')
      setDescription('')
      setImage(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your collectible.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSelected() {
    if (!selected || !window.confirm(`Delete "${selected.title}" permanently?`)) return
    if (!adminToken.trim()) { setShowToken(true); setError('Enter your owner token to delete a collectible.'); return }
    setDeleteBusy(true)
    setError('')
    try {
      await api.delete(selected.id, adminToken.trim())
      setItems(current => current.filter(item => item.id !== selected.id))
      setSelected(null)
      setModal(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete this collectible.')
    } finally {
      setDeleteBusy(false)
    }
  }

  function closeModal() {
    setModal(null)
    setError('')
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={e => { e.preventDefault(); closeModal() }} aria-label="Back to collection">
          <span className="brand-mark"><Sparkles size={17} strokeWidth={1.7} /></span>
          <span>kept <span className="brand-light">stories</span></span>
        </a>
        <div className="top-actions">
          <span className="collection-label"><span className="status-dot" /> PERSONAL COLLECTION</span>
          <button className="add-button" onClick={openAdd}><Plus size={16} /> <span>Add collectible</span></button>
        </div>
      </header>

      <main>
        <section className="intro">
          <p className="eyebrow">A LITTLE ARCHIVE OF MEANINGFUL THINGS</p>
          <h1>Little things.<br /><span>Big stories.</span></h1>
          <p className="intro-copy">A home for the things I choose to keep —<br className="desktop-break" /> and the stories that make them matter.</p>
          <div className="intro-foot"><span className="tiny-line" /> COLLECTED WITH CARE</div>
        </section>

        <section className="collection-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE COLLECTION</p>
              <h2>Collected moments <span className="count">{items.length.toString().padStart(2, '0')}</span></h2>
            </div>
            <p className="section-note">Each one has a story.</p>
          </div>

          {error && !modal && <div className="notice error-notice">{error} <button onClick={() => setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}

          {loading ? (
            <div className="loading-state"><LoaderCircle className="spin" size={24}/><span>Gathering your collection…</span></div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><ImagePlus size={25}/></div>
              <h3>Your collection starts here.</h3>
              <p>Upload your first photo and give it a story of its own.</p>
              <button className="add-button" onClick={openAdd}><Plus size={16}/> Add your first collectible</button>
            </div>
          ) : (
            <div className="gallery">
              {items.map((item, index) => (
                <button className="collectible-card" key={item.id} onClick={() => void openDetail(item)} aria-label={`Open ${item.title}`}>
                  <div className="card-image-wrap">
                    <img src={imageSrc(item.image_url)} alt="" loading={index < 4 ? 'eager' : 'lazy'} />
                    <span className="card-open"><ArrowUpRight size={18}/></span>
                    <span className="card-number">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <span className="card-title">{item.title}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <span>KEPT WITH MEANING <span className="footer-heart">✳</span></span>
        <span>A personal archive, made with care.</span>
      </footer>

      {modal && (
        <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) closeModal() }}>
          <section className={`modal ${modal === 'detail' ? 'detail-modal' : 'add-modal'}`} role="dialog" aria-modal="true" aria-label={modal === 'add' ? 'Add collectible' : 'Collectible story'}>
            <button className="modal-close" onClick={closeModal} aria-label="Close"><X size={19}/></button>
            {modal === 'add' ? (
              <div className="form-layout">
                <div className="form-heading">
                  <p className="eyebrow">MAKE ROOM FOR A MEMORY</p>
                  <h2>Add a <em>collectible.</em></h2>
                  <p>Give it a name, add a photo, and tell its story.</p>
                </div>
                <form onSubmit={handleSubmit} className="collectible-form">
                  <label className="upload-zone">
                    {preview ? <img className="upload-preview" src={preview} alt="Selected preview"/> : <span className="upload-placeholder"><ImagePlus size={26}/><strong>Choose a photo</strong><small>JPG, PNG, WEBP or GIF · up to 8 MB</small></span>}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => setImage(e.target.files?.[0] ?? null)} required />
                    {preview && <span className="change-photo">Change photo</span>}
                  </label>
                  <label className="field-label">TITLE <input value={title} onChange={e => setTitle(e.target.value)} maxLength={160} placeholder="What do you call it?" required /></label>
                  <label className="field-label">THE STORY <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={10000} placeholder="Where did it come from? Why does it matter to you?" rows={5} required /></label>
                  <div className="owner-token">
                    <button type="button" className="token-toggle" onClick={() => setShowToken(value => !value)}><LockKeyhole size={14}/> {showToken ? 'Hide owner token' : 'Owner access'} <span>{showToken ? '−' : '+'}</span></button>
                    {showToken && <input type="password" value={adminToken} onChange={e => setAdminToken(e.target.value)} autoComplete="current-password" placeholder="Enter the ADMIN_TOKEN from backend/.env" />}
                  </div>
                  {error && <p className="form-error" role="alert">{error}</p>}
                  <button className="submit-button" type="submit" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={17}/> Saving…</> : <>Add to the collection <ArrowUpRight size={17}/></>}</button>
                  <p className="form-privacy"><LockKeyhole size={12}/> Your owner token is not saved by this page.</p>
                </form>
              </div>
            ) : selected && (
              <div className="detail-layout">
                <div className="detail-image"><img src={imageSrc(selected.image_url)} alt={selected.title}/><span className="image-caption">A KEPT MOMENT <span>✳</span></span></div>
                <div className="detail-copy">
                  <button className="back-link" onClick={closeModal}><ArrowLeft size={15}/> Back to collection</button>
                  <p className="eyebrow">A STORY FROM THE COLLECTION</p>
                  <h2>{selected.title}</h2>
                  <div className="story-rule"><span/></div>
                  <p className="story-text">{selected.description || 'A story waiting to be added.'}</p>
                  <div className="detail-meta"><span>ADDED TO THE ARCHIVE</span><span>{new Date(selected.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                  <button className="delete-button" onClick={() => void deleteSelected()} disabled={deleteBusy}>{deleteBusy ? <LoaderCircle className="spin" size={15}/> : <Trash2 size={15}/>} Delete collectible</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default App
