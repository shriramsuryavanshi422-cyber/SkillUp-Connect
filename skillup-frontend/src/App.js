import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { sendNotification } from './utils/notify';

const API_BASE = `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api`;

const fetchJson = async (path, options = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 60000); // 60 second timeout for Render wake-up

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    clearTimeout(id);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Server or database might be unreachable.');
    }
    throw err;
  }
};

const emptyAuth = { email: '', password: '', ngo_name: '' };
const emptyWorkshop = {
  title: '',
  category: '',
  date: '',
  location: '',
  description: '',
  institute_name: '',
};
const emptyStats = {
  workshopsPublished: 0,
  messagesReceived: 0,
  estimatedLivesTouched: 0,
};

const emptyContact = {
  full_name: '',
  email: '',
  subject: '',
  message: '',
};

const emptyVolunteer = {
  full_name: '',
  email: '',
  skills: '',
  message: '',
};

const ADMIN_EMAIL = 'shriramsuryavanshi422@gmail.com';

function App() {
  const [workshops, setWorkshops] = useState([]);
  const [pendingWorkshops, setPendingWorkshops] = useState([]);
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [impactStats, setImpactStats] = useState(emptyStats);

  const [view, setView] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [showRegister, setShowRegister] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info', visible: false });

  const [authData, setAuthData] = useState(() => ({
    ...emptyAuth,
    email: localStorage.getItem('userEmail') || '',
  }));
  const [newWorkshop, setNewWorkshop] = useState(emptyWorkshop);
  const [editingWorkshopId, setEditingWorkshopId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('dateAsc');
  const [savedWorkshops, setSavedWorkshops] = useState(() => {
    try {
      const stored = localStorage.getItem('savedWorkshops');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [contactForm, setContactForm] = useState(emptyContact);
  const [contactMessages, setContactMessages] = useState([]);
  const [volunteerForm, setVolunteerForm] = useState(emptyVolunteer);
  const [volunteerSubmitting, setVolunteerSubmitting] = useState(false);

  const aboutRef = useRef(null);
  const programsRef = useRef(null);
  const contactRef = useRef(null);

  const showToast = (message, type = 'info', duration = 2800) => {
    setToast({ message, type, visible: true });
    window.setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), duration);
  };

  const fetchApproved = useCallback(async () => {
    const data = await fetchJson('/workshops');
    setWorkshops(data);
    return data;
  }, []);

  const fetchPending = useCallback(async () => {
    const data = await fetchJson('/admin/pending');
    setPendingWorkshops(data);
    return data;
  }, []);

  const fetchEvents = useCallback(async () => {
    const data = await fetchJson('/events');
    setFeaturedEvents(data);
    return data;
  }, []);

  const fetchImpactStats = useCallback(async () => {
    const data = await fetchJson('/impact-stats');
    setImpactStats(data);
    return data;
  }, []);

  const fetchContactMessages = useCallback(async () => {
    const data = await fetchJson('/contacts');
    setContactMessages(data);
    return data;
  }, []);



  useEffect(() => {
    const savedEmail = localStorage.getItem('userEmail');

    const loadInitialData = async () => {
      try {
        setGlobalError('');
        const results = await Promise.allSettled([
          fetchApproved(),
          fetchPending(),
          fetchEvents(),
          fetchImpactStats(),
          ...(savedEmail === ADMIN_EMAIL
            ? [fetchContactMessages()]
            : []),
        ]);

        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
          setGlobalError(failed[0].reason?.message || 'Failed to connect to the server.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [
    fetchApproved,
    fetchContactMessages,
    fetchEvents,
    fetchImpactStats,
    fetchPending,
  ]);

  useEffect(() => {
    try {
      localStorage.setItem('savedWorkshops', JSON.stringify(savedWorkshops));
    } catch {
      // Ignore localStorage write errors.
    }
  }, [savedWorkshops]);

  const scrollToSection = (ref) => {
    setView('home');
    window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const endpoint = showRegister ? '/register' : '/login';
      const data = await fetchJson(endpoint, {
        method: 'POST',
        body: JSON.stringify(authData),
      });

      showToast(data.message, 'success');

      if (!showRegister) {
        setIsLoggedIn(true);
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', authData.email);
        setView('home');
        await fetchPending();
        if (authData.email === ADMIN_EMAIL) {
          await fetchContactMessages();
        }
      } else {
        setShowRegister(false);
      }
    } catch (error) {
      showToast(error.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setView('home');
    setShowRegister(false);
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    setAuthData(emptyAuth);
    setContactMessages([]);
  };

  const approveWorkshop = async (id) => {
    setIsSubmitting(true);

    try {
      await fetchJson(`/admin/approve/${id}`, { method: 'PUT' });
      showToast('Workshop published!', 'success');
      await Promise.all([fetchPending(), fetchApproved(), fetchImpactStats()]);
    } catch (error) {
      showToast(error.message || 'Unable to approve. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const rejectWorkshop = async (id) => {
    if (!window.confirm('Are you sure you want to delete this workshop?')) {
      return;
    }

    setIsSubmitting(true);

    try {
      await fetchJson(`/workshops/${id}`, { method: 'DELETE' });
      showToast('Workshop removed.', 'success');
      await Promise.all([fetchPending(), fetchApproved(), fetchImpactStats()]);
    } catch (error) {
      showToast(error.message || 'Unable to delete. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteLiveWorkshop = async (id) => {
    if (!window.confirm('Delete this live program?')) {
      return;
    }

    setIsSubmitting(true);

    try {
      await fetchJson(`/workshops/${id}`, { method: 'DELETE' });
      showToast('Program deleted.', 'success');
      await Promise.all([fetchApproved(), fetchImpactStats()]);
    } catch (error) {
      showToast(error.message || 'Unable to delete. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditingWorkshop = (workshop) => {
    setEditingWorkshopId(workshop.id);
    setIsEditing(true);
    setShowEditModal(true);

    // DB dates are ISO strings like "2026-04-05T00:00:00.000Z"; slice to YYYY-MM-DD for <input type="date">
    const rawDate = workshop.date || workshop.event_date || '';
    const formattedDate = rawDate ? rawDate.slice(0, 10) : '';

    setNewWorkshop({
      title: workshop.title || '',
      category: workshop.category || '',
      date: formattedDate,
      location: workshop.location || '',
      description: workshop.description || '',
      institute_name: workshop.institute_name || '',
    });
  };

  const cancelEdit = () => {
    setEditingWorkshopId(null);
    setIsEditing(false);
    setShowEditModal(false);
    setNewWorkshop(emptyWorkshop);
  };

  const handleSubmitWorkshop = async (e) => {
    e.preventDefault();

    if (!newWorkshop.title.trim() || !newWorkshop.description.trim()) {
      showToast('Title and description are required.', 'error');
      return;
    }

    if (!newWorkshop.date) {
      showToast('Please choose a date for the workshop.', 'error');
      return;
    }

    if (new Date(newWorkshop.date).getTime() < Date.now()) {
      showToast('Please choose a future date for the workshop.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/workshops/${editingWorkshopId}` : '/workshops';

      // Capture form data BEFORE resetting
      const submittedWorkshop = { ...newWorkshop };

      await fetchJson(url, {
        method,
        body: JSON.stringify(submittedWorkshop),
      });

      // Send email notification for new program submissions (not edits)
      if (!isEditing) {
        try {
          await sendNotification({
            type: 'program',
            name: submittedWorkshop.institute_name,
            email: authData.email,
            message: `New program submitted: ${submittedWorkshop.title} — ${submittedWorkshop.description}`,
          });
        } catch (_) {
          // Notification failure should not block the main flow
        }
      }

      await Promise.all([fetchPending(), fetchApproved(), fetchImpactStats()]);
      setNewWorkshop(emptyWorkshop);
      showToast(isEditing ? 'Program updated successfully!' : 'Submitted! An admin will review it.', 'success');
      setIsEditing(false);
      setEditingWorkshopId(null);
      setShowEditModal(false);
    } catch (error) {
      showToast(error.message || 'Unable to submit. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactSubmitting(true);

    try {
      // Capture form data before resetting
      const submittedContact = { ...contactForm };

      await fetchJson('/contacts', {
        method: 'POST',
        body: JSON.stringify(submittedContact),
      });

      // Trigger email notification for contact form
      try {
        await sendNotification({
          type: 'contact',
          name: submittedContact.full_name,
          email: submittedContact.email,
          message: `[${submittedContact.subject}] ${submittedContact.message}`,
        });
      } catch (_) {
        // Notification failure should not block the main flow
      }

      setContactForm(emptyContact);
      showToast('Message sent successfully! Saved in admin inbox.', 'success');
      await Promise.all([fetchContactMessages(), fetchImpactStats()]);
    } catch (error) {
      showToast(error.message || 'Unable to send message.', 'error');
    } finally {
      setContactSubmitting(false);
    }
  };

  const handleVolunteerSubmit = async (e) => {
    e.preventDefault();
    setVolunteerSubmitting(true);

    try {
      await sendNotification({
        type: 'volunteer',
        name: volunteerForm.full_name,
        email: volunteerForm.email,
        message: `Skills: ${volunteerForm.skills}. ${volunteerForm.message}`,
      });

      setVolunteerForm(emptyVolunteer);
      showToast('Volunteer application sent successfully!', 'success');
    } catch (error) {
      showToast(error.message || 'Unable to submit volunteer form.', 'error');
    } finally {
      setVolunteerSubmitting(false);
    }
  };

  const deleteContactMessage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    setIsSubmitting(true);
    try {
      await fetchJson(`/contacts/${id}`, { method: 'DELETE' });
      showToast('Message deleted.', 'success');
      await Promise.all([fetchContactMessages(), fetchImpactStats()]);
    } catch (error) {
      showToast(error.message || 'Unable to delete message.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSavedWorkshop = (id) => {
    setSavedWorkshops((prev) => {
      if (prev.includes(id)) return prev.filter((savedId) => savedId !== id);
      return [...prev, id];
    });
  };

  const formatDate = (rawDate) => {
    if (!rawDate) return 'TBA';
    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) return 'TBA';
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatNumber = (value) => new Intl.NumberFormat().format(Number(value || 0));



  const getVisibleWorkshops = () => {
    const normalized = searchQuery.trim().toLowerCase();

    const filtered = workshops.filter((workshop) => {
      const text = `${workshop.title} ${workshop.description} ${workshop.institute_name}`.toLowerCase();
      const matchesSearch = !normalized || text.includes(normalized);
      const matchesCategory = categoryFilter === 'All' || workshop.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    return [...filtered].sort((a, b) => {
      const aDate = new Date(a.event_date || a.date).getTime();
      const bDate = new Date(b.event_date || b.date).getTime();

      if (sortOrder === 'dateAsc') return aDate - bDate;
      if (sortOrder === 'dateDesc') return bDate - aDate;
      return 0;
    });
  };

  const isAdmin = authData.email === ADMIN_EMAIL;
  const impactCards = [
    { label: 'Programs Published', value: formatNumber(impactStats.workshopsPublished) },
    { label: 'Messages Received', value: formatNumber(impactStats.messagesReceived) },
  ];

  // Removed blocking full-screen loader to improve perceived performance during cold starts

  if (globalError) {
    return (
      <div className="App">
        <nav className="navbar">
          <button className="logo" type="button" onClick={() => window.location.reload()}>
            SkillUp Connect
          </button>
        </nav>
        <div className="empty-state" style={{ margin: '15vh auto', maxWidth: '600px', textAlign: 'center', border: '1px solid #1f2937', backgroundColor: '#0f172a', padding: '3rem', borderRadius: '12px' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Connection Failed</h2>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>{globalError}</p>
          <p style={{ color: '#64748b', marginTop: '1rem', lineHeight: '1.6' }}>Please double check that your backend server is running and connected to a MySQL database.</p>
          <button className="submit-btn" style={{ marginTop: '2rem' }} onClick={() => window.location.reload()}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {toast.visible && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      <nav className="navbar">
        <button className="logo" type="button" onClick={() => setView('home')}>
          SkillUp Connect
        </button>

        <div className="nav-links">
          <button className={`nav-link ${view === 'home' ? 'active' : ''}`} type="button" onClick={() => setView('home')}>
            Home
          </button>
          <button className="nav-link" type="button" onClick={() => scrollToSection(aboutRef)}>
            About
          </button>
          <button className="nav-link" type="button" onClick={() => scrollToSection(programsRef)}>
            Programs
          </button>

          <button className="nav-link" type="button" onClick={() => scrollToSection(contactRef)}>
            Contact
          </button>
          <button className="nav-link" type="button" onClick={() => (isLoggedIn ? setView('home') : setView('login'))}>
            NGO Portal
          </button>
          {isLoggedIn && (
            <button className="nav-link" type="button" onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>
      </nav>

      {view === 'home' && (
        <div className="landing-page">
          <header className="hero-section">
            <div className="hero-copy">
              <span className="eyebrow">Community-led learning platform</span>
              <h1>Empowering Communities Through Skill Transformation.</h1>
              <p>
                SkillUp Connect bridges the gap between eager learners and expert educators.
                We provide a robust platform for NGOs to seamlessly publish workshops, foster engagement, and broadcast verifiable community impact.
              </p>

              <div className="hero-actions">
                <button className="submit-btn" type="button" onClick={() => scrollToSection(programsRef)}>
                  Explore Programs
                </button>

                <button className="outline-btn" type="button" onClick={() => setView('login')}>
                  NGO Portal
                </button>
              </div>
            </div>

            <aside className="hero-panel">
              <div className="hero-panel-card">
                <span className="panel-label">Live Impact</span>
                <div className="panel-value">{formatNumber(impactStats.estimatedLivesTouched)}</div>
                <p>Estimated lives touched through educational programs and community support.</p>
              </div>
              <div className="hero-mini-grid">
                {impactCards.map((card) => (
                  <div key={card.label} className="mini-stat">
                    <span>{card.label}</span>
                    <strong>{card.value}</strong>
                  </div>
                ))}
              </div>
            </aside>
          </header>

          <section ref={aboutRef} className="section-shell">
            <div className="section-heading">
              <span className="section-tag">About Us</span>
              <h2>Our Mission: Creating a calm, credible space for real impact.</h2>
              <p>
                A trustworthy NGO thrives on a clear mission, visible results, and accessible pathways for contributors. SkillUp Connect architects the digital foundation for authentic social growth.
              </p>
            </div>

            <div className="info-grid">
              <article className="info-card">
                <h3>Community Building</h3>
                <p>We foster a collaborative environment where individuals grow together, transforming local neighborhoods through shared knowledge, continuous support, and collective ambition.</p>
              </article>
              <article className="info-card">
                <h3>Resource Accessibility</h3>
                <p>Our platform bridges the gap between eager learners and vital educational tools, providing equitable access to skill-building workshops, expert mentorship, and career paths.</p>
              </article>
              <article className="info-card">
                <h3>Inspiring Trust</h3>
                <p>Transparency is foundational to our mission. We showcase verifiable impact metrics and real community feedback to guarantee to our partners that every contribution transforms lives.</p>
              </article>
            </div>
          </section>

          <section className="section-shell">
            <div className="section-heading">
              <span className="section-tag">Impact Metrics</span>
              <h2>Quantifiable Impact: Showcasing numbers you can trust.</h2>
              <p>Transparency is at the core of our operations. Every published program and engaged community member directly contributes to our active ecosystem.</p>
            </div>

            <div className="stats-grid">
              {impactCards.map((card) => (
                <article key={card.label} className="stat-card">
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="section-shell">
            <div className="section-heading">
              <span className="section-tag">Community Events</span>
              <h2>Upcoming Skill Development Workshops.</h2>
            </div>

            {loading && featuredEvents.length === 0 ? (
              <div className="empty-state">
                <p>Loading community events...</p>
              </div>
            ) : (
              <div className="events-grid">
                {featuredEvents.map((event) => (
                  <article key={event.id} className="event-card">
                    <span className="category-badge">{event.badge || event.category}</span>
                    <h3>{event.title}</h3>
                    <p className="muted-line">{event.location}</p>
                    <p className="program-date">{formatDate(event.event_date)}</p>
                    <p>{event.description}</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section ref={programsRef} className="section-shell">
            <div className="section-heading">
              <span className="section-tag">Live Programs</span>
              <h2>Browse approved programs with a clear and simple flow.</h2>
            </div>

            <div className="filter-row">
              <input
                className="filter-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, NGO, or keywords"
              />

              <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                {['All', ...Array.from(new Set(workshops.map((workshop) => workshop.category).filter(Boolean)))].map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select className="filter-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="dateAsc">Oldest to Newest</option>
                <option value="dateDesc">Newest to Oldest</option>
              </select>

              {savedWorkshops.length > 0 && <span className="saved-count">{savedWorkshops.length} saved</span>}
            </div>

            {getVisibleWorkshops().length > 0 ? (
              <div className="workshop-list">
                {getVisibleWorkshops().map((workshop) => (
                  <article key={workshop.id} className="program-card">
                    <span className="category-badge">{workshop.category}</span>
                    <h3>{workshop.title}</h3>
                    <p className="muted-line">
                      <strong>{workshop.institute_name}</strong>
                    </p>
                    <p className="program-date">
                      <strong>Date:</strong> {formatDate(workshop.date || workshop.event_date)}
                    </p>
                    <p>{workshop.description}</p>

                    <div className="card-actions">
                      <button
                        className="nav-btn"
                        type="button"
                        onClick={() => toggleSavedWorkshop(workshop.id)}
                        style={{ backgroundColor: savedWorkshops.includes(workshop.id) ? '#d7a52f' : '#157a5f' }}
                      >
                        {savedWorkshops.includes(workshop.id) ? 'Saved' : 'Save'}
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            className="nav-btn"
                            type="button"
                            onClick={() => startEditingWorkshop(workshop)}
                            style={{ backgroundColor: '#2563eb' }}
                          >
                            Edit
                          </button>
                          <button
                            className="nav-btn"
                            type="button"
                            onClick={() => deleteLiveWorkshop(workshop.id)}
                            style={{ backgroundColor: '#dc2626' }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                {loading ? (
                  <>
                    <h3>Loading programs...</h3>
                    <p>Please wait while we wake up the server.</p>
                  </>
                ) : (
                  <>
                    <h3>No live programs yet.</h3>
                    <p>Check back later or register as an NGO to post one.</p>
                  </>
                )}
              </div>
            )}
          </section>

          <section ref={contactRef} className="section-shell">
            <div className="section-heading">
              <span className="section-tag">{isAdmin ? 'Admin Inbox' : 'Get In Touch'}</span>
              <h2>{isAdmin ? 'Messages from the contact form.' : 'Start a conversation with our team.'}</h2>
              {isAdmin && <p>These are the transparent communications saved from the public contact form.</p>}
            </div>

            {!isAdmin ? (
              <form onSubmit={handleContactSubmit} className="modern-form contact-form">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={contactForm.full_name}
                  onChange={(e) => setContactForm({ ...contactForm, full_name: e.target.value })}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Subject"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  required
                />
                <textarea
                  placeholder="Message"
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  required
                />
                <button type="submit" className="submit-btn" disabled={contactSubmitting}>
                  {contactSubmitting ? 'Processing...' : 'Send Message'}
                </button>
              </form>
            ) : contactMessages.length > 0 ? (
              <div className="contact-inbox">
                {contactMessages.map((message) => (
                  <article key={message.id} className="contact-card">
                    <div className="contact-card-head">
                      <div>
                        <h3>{message.subject}</h3>
                        <p className="muted-line">
                          {message.full_name} · {message.email}
                        </p>
                      </div>
                      <span className="contact-date">
                        {formatDate(message.created_at)}
                      </span>
                    </div>
                    <p className="contact-message">{message.message}</p>
                    {isAdmin && (
                      <div className="card-actions" style={{ marginTop: '16px' }}>
                        <button
                          className="nav-btn"
                          type="button"
                          onClick={() => deleteContactMessage(message.id)}
                          style={{ backgroundColor: '#dc2626' }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>No contact messages yet.</h3>
                <p>New submissions will appear here after visitors send the form.</p>
              </div>
            )}
          </section>

          <section className="section-shell volunteer-section">
            <div className="section-heading">
              <span className="section-tag">Volunteer</span>
              <h2>Join Us as a Volunteer & Make a Difference.</h2>
              <p>Contribute your time, skills, and passion to uplift communities. Sign up and we'll get in touch!</p>
            </div>

            <form onSubmit={handleVolunteerSubmit} className="modern-form volunteer-form">
              <input
                type="text"
                placeholder="Full Name"
                value={volunteerForm.full_name}
                onChange={(e) => setVolunteerForm({ ...volunteerForm, full_name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={volunteerForm.email}
                onChange={(e) => setVolunteerForm({ ...volunteerForm, email: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Skills (e.g. Teaching, Design, Coding)"
                value={volunteerForm.skills}
                onChange={(e) => setVolunteerForm({ ...volunteerForm, skills: e.target.value })}
                required
              />
              <textarea
                placeholder="Why do you want to volunteer?"
                value={volunteerForm.message}
                onChange={(e) => setVolunteerForm({ ...volunteerForm, message: e.target.value })}
                required
              />
              <button type="submit" className="submit-btn" disabled={volunteerSubmitting}>
                {volunteerSubmitting ? 'Processing...' : 'Sign Up to Volunteer'}
              </button>
            </form>
          </section>

          <section className="section-shell">
            <div className="section-heading">
              <span className="section-tag">Inspiration</span>
              <h2>Voices of True Patriots.</h2>
            </div>

            <div className="testimonial-grid">
              {[
                { name: 'Swami Vivekananda', quote: 'Arise, awake, and stop not till the goal is reached.', role: 'Spiritual Leader' },
                { name: 'Subhash Chandra Bose', quote: 'One individual may die for an idea, but that idea will, after his death, incarnate itself in a thousand lives.', role: 'Freedom Fighter' },
                { name: 'Dr. A.P.J. Abdul Kalam', quote: 'Dream, dream, dream. Dreams transform into thoughts and thoughts result in action.', role: 'Former President of India' },
                { name: 'Bhagat Singh', quote: 'They may kill me, but they cannot kill my ideas. They can crush my body, but they will not be able to crush my spirit.', role: 'Revolutionary' }
              ].map((patriot, index) => (
                <article key={index} className="testimonial-card">
                  <p>"{patriot.quote}"</p>
                  <h3 style={{ color: 'var(--text)' }}>{patriot.name}</h3>
                  <span style={{ color: 'var(--primary)' }}>{patriot.role}</span>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}

      {view === 'login' && !isLoggedIn && (
        <section className="auth-view">
          <div className="auth-container">
            <div className="auth-card">
              <header className="auth-header">
                <h2>{showRegister ? 'Create your NGO account' : 'Welcome back'}</h2>
                <p>{showRegister ? 'Register and start publishing programs.' : 'Login to manage your programs and approvals.'}</p>
              </header>

              <form onSubmit={handleAuth} className="auth-form">
                {showRegister && (
                  <input
                    type="text"
                    placeholder="NGO Name"
                    value={authData.ngo_name}
                    onChange={(e) => setAuthData({ ...authData, ngo_name: e.target.value })}
                    required
                  />
                )}
                <input
                  type="email"
                  placeholder="Email"
                  value={authData.email}
                  onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                  required
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={authData.password}
                  onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  required
                />

                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : showRegister ? 'Create account' : 'Login'}
                </button>

                <p className="switch-view" onClick={() => setShowRegister(!showRegister)}>
                  {showRegister ? 'Already have an account? Login' : 'New NGO? Register here'}
                </p>
              </form>
            </div>
          </div>
        </section>
      )}

      {isLoggedIn && (
        <main className="main-content">
          {isAdmin && showEditModal && (
            <div className="modal-overlay" onClick={cancelEdit}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3>Edit workshop</h3>
                <form onSubmit={handleSubmitWorkshop} className="auth-form">
                  <input
                    type="text"
                    placeholder="Program Title"
                    value={newWorkshop.title}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, title: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Institute Name"
                    value={newWorkshop.institute_name}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, institute_name: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    value={newWorkshop.category}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, category: e.target.value })}
                    required
                  />
                  <input
                    type="date"
                    value={newWorkshop.date}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, date: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    value={newWorkshop.location}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, location: e.target.value })}
                    required
                  />
                  <textarea
                    placeholder="Description"
                    value={newWorkshop.description}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, description: e.target.value })}
                    required
                  />
                  <div className="button-row">
                    <button type="submit" className="submit-btn" disabled={isSubmitting}>
                      {isSubmitting ? 'Processing...' : 'Update Program'}
                    </button>
                    <button
                      type="button"
                      className="nav-btn"
                      style={{ backgroundColor: '#dc2626' }}
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {isAdmin && (
            <section className="admin-inbox">
              <h2>Pending approvals ({pendingWorkshops.length})</h2>
              {pendingWorkshops.length > 0 ? (
                <div className="workshop-list">
                  {pendingWorkshops.map((workshop) => (
                    <article key={workshop.id} className="program-card approval-card">
                      <h3>{workshop.title}</h3>
                      <p>
                        <strong>NGO:</strong> {workshop.institute_name}
                      </p>
                      <div className="card-actions">
                        <button
                          className="nav-btn"
                          type="button"
                          onClick={() => approveWorkshop(workshop.id)}
                          style={{ backgroundColor: '#16a34a' }}
                        >
                          Approve
                        </button>
                        <button
                          className="nav-btn"
                          type="button"
                          onClick={() => rejectWorkshop(workshop.id)}
                          style={{ backgroundColor: '#dc2626' }}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>No pending workshops right now.</h3>
                  <p>New NGO submissions will appear here for approval.</p>
                </div>
              )}
            </section>
          )}


          <section className="admin-section">
            <form onSubmit={handleSubmitWorkshop} className="modern-form">
              <h3>Submit a new program</h3>
              <p>
                Logged in as: <strong>{authData.email}</strong>
              </p>
              <input
                type="text"
                placeholder="Program Title"
                value={newWorkshop.title}
                onChange={(e) => setNewWorkshop({ ...newWorkshop, title: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Institute Name"
                value={newWorkshop.institute_name}
                onChange={(e) => setNewWorkshop({ ...newWorkshop, institute_name: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Category"
                value={newWorkshop.category}
                onChange={(e) => setNewWorkshop({ ...newWorkshop, category: e.target.value })}
                required
              />
              <input
                type="date"
                value={newWorkshop.date}
                onChange={(e) => setNewWorkshop({ ...newWorkshop, date: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Location"
                value={newWorkshop.location}
                onChange={(e) => setNewWorkshop({ ...newWorkshop, location: e.target.value })}
                required
              />
              <textarea
                placeholder="Description"
                value={newWorkshop.description}
                onChange={(e) => setNewWorkshop({ ...newWorkshop, description: e.target.value })}
                required
              />
              <div className="button-row">
                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Processing...' : isEditing ? 'Update Program' : 'Send for Review'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    className="nav-btn"
                    style={{ backgroundColor: '#dc2626' }}
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>
        </main>
      )}

      <footer className="professional-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3 style={{ color: 'var(--primary)' }}>SkillUp Connect</h3>
            <p style={{ color: 'var(--muted)', marginTop: '12px', lineHeight: '1.6' }}>
              Building trust through community action. A secure platform dedicated to verifiable impact, educational resource access, and inclusive growth.
            </p>
          </div>
          <div className="footer-links-section">
            <h4 style={{ color: 'var(--text)', marginBottom: '16px' }}>Quick Links</h4>
            <div className="footer-links">
              <button type="button" onClick={() => scrollToSection(aboutRef)}>About Us</button>
              <button type="button" onClick={() => scrollToSection(programsRef)}>Live Programs</button>
              <button type="button" onClick={() => scrollToSection(contactRef)}>Contact Team</button>
            </div>
          </div>
          <div className="footer-contact">
            <h4 style={{ color: 'var(--text)', marginBottom: '16px' }}>Get In Touch</h4>
            <p style={{ color: 'var(--muted)', marginBottom: '8px' }}>Email: adminskilup@gmail.com</p>
            <p style={{ color: 'var(--muted)' }}>WhatsApp: +91 94217 89605</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.9rem', textAlign: 'center' }}>
            &copy; {new Date().getFullYear()} SkillUp Connect. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;

