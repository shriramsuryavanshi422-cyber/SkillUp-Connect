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
  type: 'workshop',
  title: '',
  category: '',
  date: '',
  location: '',
  description: '',
  institute_name: '',
  contact_no: '',
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
  phone: '',
  skills: '',
  message: '',
};

const ADMIN_EMAIL = 'adminskilup@gmail.com';

function App() {
  const [workshops, setWorkshops] = useState([]);
  const [pendingWorkshops, setPendingWorkshops] = useState([]);
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [impactStats, setImpactStats] = useState(emptyStats);

  const [view, setView] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [showRegister, setShowRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
  const [editingEventId, setEditingEventId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [savedWorkshops, setSavedWorkshops] = useState(() => {
    try {
      const stored = localStorage.getItem('savedWorkshops');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [contactForm, setContactForm] = useState(emptyContact);
  // eslint-disable-next-line no-unused-vars
  const [contactMessages, setContactMessages] = useState([]);
  const [volunteerRequests, setVolunteerRequests] = useState([]);
  const [volunteerForm, setVolunteerForm] = useState(emptyVolunteer);
  const [volunteerSubmitting, setVolunteerSubmitting] = useState(false);
  const [showContactSection, setShowContactSection] = useState(false);

  const aboutRef = useRef(null);
  const programsRef = useRef(null);
  const adminRef = useRef(null);
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

  const fetchVolunteerRequests = useCallback(async () => {
    const data = await fetchJson('/volunteers');
    setVolunteerRequests(data);
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
            ? [fetchContactMessages(), fetchVolunteerRequests()]
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
    fetchVolunteerRequests,
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
          setShowContactSection(true);
          await Promise.all([fetchContactMessages(), fetchVolunteerRequests()]);
          window.setTimeout(() => {
            adminRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
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
    setVolunteerRequests([]);
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

  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this community event?')) {
      return;
    }

    setIsSubmitting(true);

    try {
      await fetchJson(`/events/${id}`, { method: 'DELETE' });
      showToast('Event deleted.', 'success');
      await fetchEvents();
    } catch (error) {
      showToast(error.message || 'Unable to delete event.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditingEvent = (event) => {
    setEditingEventId(event.id);
    setEditingWorkshopId(null);
    setIsEditing(true);
    setShowEditModal(true);

    const rawDate = event.event_date || '';
    const formattedDate = rawDate ? rawDate.slice(0, 10) : '';

    setNewWorkshop({
      type: 'event',
      title: event.title || '',
      category: event.category || '',
      date: formattedDate,
      location: event.location || '',
      description: event.description || '',
      institute_name: event.badge || 'Community Event',
      contact_no: event.contact_no || '',
    });
  };

  const startEditingWorkshop = (workshop) => {
    setEditingWorkshopId(workshop.id);
    setEditingEventId(null);
    setIsEditing(true);
    setShowEditModal(true);

    // DB dates are ISO strings like "2026-04-05T00:00:00.000Z"; slice to YYYY-MM-DD for <input type="date">
    const rawDate = workshop.date || workshop.event_date || '';
    const formattedDate = rawDate ? rawDate.slice(0, 10) : '';

    setNewWorkshop({
      type: 'workshop',
      title: workshop.title || '',
      category: workshop.category || '',
      date: formattedDate,
      location: workshop.location || '',
      description: workshop.description || '',
      institute_name: workshop.institute_name || '',
      contact_no: workshop.contact_no || '',
    });
  };

  const cancelEdit = () => {
    setEditingWorkshopId(null);
    setEditingEventId(null);
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
      const submittedWorkshop = { ...newWorkshop };

      if (isEditing) {
        if (editingEventId) {
          await fetchJson(`/events/${editingEventId}`, {
            method: 'PUT',
            body: JSON.stringify({
              title: submittedWorkshop.title,
              category: submittedWorkshop.category,
              event_date: submittedWorkshop.date,
              location: submittedWorkshop.location,
              description: submittedWorkshop.description,
              badge: submittedWorkshop.institute_name,
              contact_no: submittedWorkshop.contact_no,
            }),
          });
          await fetchEvents();
          showToast('Event updated successfully!', 'success');
        } else if (editingWorkshopId) {
          await fetchJson(`/workshops/${editingWorkshopId}`, {
            method: 'PUT',
            body: JSON.stringify(submittedWorkshop),
          });
          await Promise.all([fetchPending(), fetchApproved(), fetchImpactStats()]);
          showToast('Program updated successfully!', 'success');
        }
      } else {
        if (submittedWorkshop.type === 'event') {
          await fetchJson('/events', {
            method: 'POST',
            body: JSON.stringify({
              title: submittedWorkshop.title,
              category: submittedWorkshop.category,
              event_date: submittedWorkshop.date,
              location: submittedWorkshop.location,
              description: submittedWorkshop.description,
              badge: submittedWorkshop.institute_name,
              contact_no: submittedWorkshop.contact_no,
            }),
          });
          await fetchEvents();
          showToast('Event submitted successfully!', 'success');
        } else {
          await fetchJson('/workshops', {
            method: 'POST',
            body: JSON.stringify(submittedWorkshop),
          });

          try {
            await sendNotification({
              type: 'program',
              name: submittedWorkshop.institute_name,
              email: authData.email,
              message: `New program submitted: ${submittedWorkshop.title} — ${submittedWorkshop.description}`,
            });
          } catch (_) {}

          await Promise.all([fetchPending(), fetchApproved(), fetchImpactStats()]);
          showToast('Submitted! An admin will review it.', 'success');
        }
      }

      setNewWorkshop(emptyWorkshop);
      setIsEditing(false);
      setEditingWorkshopId(null);
      setEditingEventId(null);
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
        message: `Phone: ${volunteerForm.phone}. Skills: ${volunteerForm.skills}. ${volunteerForm.message}`,
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
    if (!window.confirm('Delete this contact message?')) {
      return;
    }

    try {
      await fetchJson(`/contacts/${id}`, { method: 'DELETE' });
      showToast('Contact message deleted.', 'success');
      await fetchContactMessages();
    } catch (error) {
      showToast(error.message || 'Unable to delete message.', 'error');
    }
  };

  const deleteVolunteerRequest = async (id) => {
    if (!window.confirm('Delete this volunteer request?')) {
      return;
    }

    try {
      await fetchJson(`/volunteers/${id}`, { method: 'DELETE' });
      showToast('Volunteer request deleted.', 'success');
      await fetchVolunteerRequests();
    } catch (error) {
      showToast(error.message || 'Unable to delete volunteer request.', 'error');
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
    return [...workshops].sort((a, b) => {
      const aDate = new Date(a.event_date || a.date).getTime();
      const bDate = new Date(b.event_date || b.date).getTime();
      return bDate - aDate;
    }).slice(0, 4);
  };

  const isAdmin = authData.email === ADMIN_EMAIL;
  const communityEvents = featuredEvents;
  const impactCards = [
    { label: 'Programs Published', value: formatNumber(impactStats.workshopsPublished) },
  ];

  // Removed blocking full-screen loader to improve perceived performance during cold starts

  if (globalError) {
    return (
      <div className="App">
        <nav className="navbar">
          <button className="logo" type="button" aria-label="SkillUp Connect Logo" onClick={() => window.location.reload()}>
            SkillUp Connect
          </button>
        </nav>
        <div className="empty-state" style={{ margin: '15vh auto', maxWidth: '600px', textAlign: 'center', border: '1px solid #1f2937', backgroundColor: '#0f172a', padding: '3rem', borderRadius: '12px' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Connection Failed</h2>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>{globalError}</p>
          <p style={{ color: '#64748b', marginTop: '1rem', lineHeight: '1.6' }}>Please double check that your backend server is running and connected to a MySQL database.</p>
          <button className="submit-btn" style={{ marginTop: '2rem' }} aria-label="Retry Connection" onClick={() => window.location.reload()}>
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {toast.visible && <div className={`toast ${toast.type}`}>{toast.message}</div>}

      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="category-badge">{selectedItem.badge || selectedItem.category}</span>
              <button 
                onClick={() => setSelectedItem(null)} 
                style={{ background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', color: 'var(--muted)', lineHeight: '1' }}>
                &times;
              </button>
            </div>
            <h3 style={{ margin: '16px 0 12px' }}>{selectedItem.title}</h3>
            
            <p className="muted-line">
              <strong>{selectedItem.institute_name || selectedItem.location}</strong>
            </p>
            <p className="program-date">
              <strong>Date:</strong> {formatDate(selectedItem.date || selectedItem.event_date)}
            </p>
            {selectedItem.contact_no && (
              <p className="program-date" style={{ color: 'var(--accent)', marginTop: '4px' }}>
                <strong>Contact:</strong> {selectedItem.contact_no}
              </p>
            )}
            
            <div style={{ padding: '16px 0', borderTop: '1px solid var(--border)', marginTop: '16px' }}>
              <p style={{ lineHeight: '1.7', color: 'var(--text)', whiteSpace: 'pre-wrap', margin: 0 }}>
                {selectedItem.description}
              </p>
            </div>
          </div>
        </div>
      )}

      <nav className="navbar">
        <button className="logo" type="button" aria-label="Go to Home" onClick={() => setView('home')}>
          SkillUp Connect
        </button>

        <div className="nav-links">
          <button className={`nav-link ${view === 'home' ? 'active' : ''}`} type="button" aria-label="Home page" onClick={() => setView('home')}>
            Home
          </button>
          <button className="nav-link" type="button" aria-label="About us" onClick={() => scrollToSection(aboutRef)}>
            About
          </button>
          <button className="nav-link" type="button" aria-label="Programs" onClick={() => scrollToSection(programsRef)}>
            Programs
          </button>
          {isLoggedIn && isAdmin && (
            <button className="nav-link" type="button" aria-label="Admin Panel" onClick={() => scrollToSection(adminRef)}>
              Admin Panel
            </button>
          )}
          <button className="nav-link" type="button" aria-label="NGO Portal" onClick={() => (isLoggedIn ? setView('home') : setView('login'))}>
            NGO Portal
          </button>
          {isLoggedIn && (
            <button className="nav-link" type="button" aria-label="Logout" onClick={handleLogout}>
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
              <h1>Helping People Build a Better Future.</h1>
              <p>
                SkillUp Connect brings together people who want to learn and NGOs that want to help. We make it easy for you to find workshops, join camps, and gain new skills to improve your life.
              </p>

              <div className="hero-actions">
                <button className="submit-btn" type="button" aria-label="Explore Programs" onClick={() => scrollToSection(programsRef)}>
                  Explore Programs
                </button>

                <button className="outline-btn" type="button" aria-label="Go to NGO Portal" onClick={() => setView('login')}>
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

          <section ref={aboutRef} className="section-shell dark-section">
            <div className="section-heading">
              <span className="section-tag">About the Initiative</span>
              <h2>Our Goal: A Stronger Community.</h2>
              <p>
                Many people have talent but don't know where to learn. Foundations like Lighthouse and Madhushram have great programs but need a way to reach you. We created this platform to connect you directly to these opportunities.
              </p>
            </div>

            <div className="section-heading" style={{ marginTop: '48px' }}>
              <h2>Our Success in Numbers.</h2>
              <p>
                We are proud to show real results. With over 100 students helped and multiple active programs, we are making a difference every single day.
              </p>
            </div>
          </section>

          <section className="section-shell dark-section bg-teal">
            <div className="section-heading">
              <span className="section-tag">Community Events</span>
              <h2>Learn Something New Today.</h2>
              <p>From Youth Leadership Camps to Career Counseling, we offer a variety of programs to help you grow. Browse our list and pick the one that fits your goals.</p>
            </div>

            {loading && communityEvents.length === 0 ? (
              <div className="empty-state">
                <p>Loading community events...</p>
              </div>
            ) : (
              <div className="events-grid">
                {communityEvents.map((event) => (
                  <article key={event.id} className="event-card clickable-card" onClick={() => setSelectedItem({ ...event, itemType: 'event' })}>
                    <span className="category-badge">{event.badge || event.category}</span>
                    <h3>{event.title}</h3>
                    <p className="muted-line">{event.location}</p>
                    <p className="program-date">{formatDate(event.event_date)}</p>
                    {event.contact_no && (
                      <p className="program-date" style={{ color: 'var(--accent)', marginTop: '4px' }}>
                        <strong>Contact:</strong> {event.contact_no}
                      </p>
                    )}
                    <p className="line-clamp-3" style={{ marginTop: '12px' }}>{event.description}</p>

                    {isAdmin && (
                      <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="nav-btn"
                          type="button"
                          aria-label="Edit event"
                          onClick={() => startEditingEvent(event)}
                          style={{ backgroundColor: '#2563eb' }}
                        >
                          Edit
                        </button>
                        <button
                          className="nav-btn"
                          type="button"
                          aria-label="Delete event"
                          onClick={() => deleteEvent(event.id)}
                          style={{ backgroundColor: '#dc2626' }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section ref={programsRef} className="section-shell dark-section bg-blue">
            <div className="section-heading">
              <span className="section-tag">Live Programs</span>
              <h2>Pick a Program to Join</h2>
            </div>

            {getVisibleWorkshops().length > 0 ? (
              <div className="workshop-list">
                {getVisibleWorkshops().map((workshop) => (
                  <article key={workshop.id} className="program-card clickable-card" onClick={() => setSelectedItem({ ...workshop, itemType: 'program' })}>
                    <span className="category-badge">{workshop.category}</span>
                    <h3>{workshop.title}</h3>
                    <p className="muted-line">
                      <strong>{workshop.institute_name}</strong>
                    </p>
                    <p className="program-date">
                      <strong>Date:</strong> {formatDate(workshop.date || workshop.event_date)}
                    </p>
                    {workshop.contact_no && (
                      <p className="program-date" style={{ color: 'var(--accent)', marginTop: '4px' }}>
                        <strong>Contact:</strong> {workshop.contact_no}
                      </p>
                    )}
                    <p className="line-clamp-3" style={{ marginTop: '12px' }}>{workshop.description}</p>

                    <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="nav-btn"
                        type="button"
                        aria-label="Save or unsave workshop"
                        onClick={() => toggleSavedWorkshop(workshop.id)}
                        style={{ backgroundColor: savedWorkshops.includes(workshop.id) ? '#D69E2E' : '#48BB78' }}
                      >
                        {savedWorkshops.includes(workshop.id) ? 'Saved' : 'Save'}
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            className="nav-btn"
                            type="button"
                            aria-label="Edit workshop"
                            onClick={() => startEditingWorkshop(workshop)}
                            style={{ backgroundColor: '#2563eb' }}
                          >
                            Edit
                          </button>
                          <button
                            className="nav-btn"
                            type="button"
                            aria-label="Delete workshop"
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

          {showContactSection && (
            <>
              <section ref={contactRef} className="section-shell dark-section bg-navy">
                <div className="section-heading">
                  <span className="section-tag">Get In Touch</span>
                  <h2>Start a conversation with our team.</h2>
                </div>

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
                  <button type="submit" className="submit-btn" disabled={contactSubmitting} aria-label="Send contact message">
                    {contactSubmitting ? 'Processing...' : 'Send Message'}
                  </button>
                </form>
              </section>

              <section className="section-shell volunteer-section dark-section">
                <div className="section-heading">
                  <span className="section-tag">Volunteer</span>
                  <h2>Want to Help Us?</h2>
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
                    type="tel"
                    placeholder="Phone"
                    value={volunteerForm.phone}
                    onChange={(e) => setVolunteerForm({ ...volunteerForm, phone: e.target.value })}
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
                  <button type="submit" className="submit-btn" disabled={volunteerSubmitting} aria-label="Submit volunteer application">
                    {volunteerSubmitting ? 'Processing...' : 'Sign Up to Volunteer'}
                  </button>
                </form>
              </section>
            </>
          )}
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
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={authData.password}
                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                    required
                    style={{ width: '100%', paddingRight: '45px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '15px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      padding: 0,
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>

                <button type="submit" className="submit-btn" disabled={isSubmitting} aria-label={showRegister ? 'Create account' : 'Login'}>
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
                <h3>{editingEventId ? 'Edit Event' : 'Edit Program'}</h3>
                <form onSubmit={handleSubmitWorkshop} className="auth-form">
                  <select
                    value={newWorkshop.type}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, type: e.target.value })}
                    required
                    style={{
                      width: '100%', borderRadius: '16px', border: '1px solid var(--border)',
                      background: 'var(--bg-strong)', padding: '13px 15px', color: 'var(--text)'
                    }}
                  >
                    <option value="workshop">Live Program</option>
                    <option value="event">Community Event</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Title"
                    value={newWorkshop.title}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, title: e.target.value })}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Institute Name or Organizer"
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
                  <input
                    type="text"
                    placeholder="Contact Number"
                    value={newWorkshop.contact_no}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, contact_no: e.target.value })}
                  />
                  <textarea
                    placeholder="Description"
                    value={newWorkshop.description}
                    onChange={(e) => setNewWorkshop({ ...newWorkshop, description: e.target.value })}
                    required
                  />
                  <div className="button-row">
                    <button type="submit" className="submit-btn" disabled={isSubmitting} aria-label="Submit modified program">
                      {isSubmitting ? 'Processing...' : 'Update Program'}
                    </button>
                    <button
                      type="button"
                      className="nav-btn"
                      aria-label="Cancel editing"
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
            <section ref={adminRef} className="admin-section admin-dashboard">
              <div className="section-heading">
                <span className="section-tag">Admin Dashboard</span>
                <h2>Approvals, messages, and volunteer requests.</h2>
                <p>Everything the admin needs is grouped here so it is easy to find and manage.</p>
              </div>

              <div className="admin-grid">
                <section className="admin-panel-card">
                  <h2>Pending approvals ({pendingWorkshops.length})</h2>
                  {pendingWorkshops.length > 0 ? (
                    <div className="admin-stack">
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
                              aria-label="Approve pending workshop"
                              onClick={() => approveWorkshop(workshop.id)}
                              style={{ backgroundColor: '#16a34a' }}
                            >
                              Approve
                            </button>
                            <button
                              className="nav-btn"
                              type="button"
                              aria-label="Reject and delete pending workshop"
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

                <section className="admin-panel-card">
                  <h2>Messages ({contactMessages.length})</h2>
                  {contactMessages.length > 0 ? (
                    <div className="admin-stack">
                      {contactMessages.map((message) => (
                        <article key={message.id} className="contact-card">
                          <div className="contact-card-head">
                            <div>
                              <h3>{message.subject}</h3>
                              <p className="muted-line">
                                <strong>{message.full_name}</strong> · {message.email}
                              </p>
                            </div>
                            <span className="contact-date">{formatDate(message.created_at)}</span>
                          </div>
                          <p className="contact-message">{message.message}</p>
                          <div className="card-actions">
                            <button
                              className="nav-btn"
                              type="button"
                              aria-label="Delete contact message"
                              onClick={() => deleteContactMessage(message.id)}
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
                      <h3>No messages yet.</h3>
                      <p>Contact submissions will appear here.</p>
                    </div>
                  )}
                </section>

                <section className="admin-panel-card">
                  <h2>Volunteer requests ({volunteerRequests.length})</h2>
                  {volunteerRequests.length > 0 ? (
                    <div className="admin-stack">
                      {volunteerRequests.map((request) => (
                        <article key={request.id} className="contact-card">
                          <div className="contact-card-head">
                            <div>
                              <h3>{request.full_name}</h3>
                              <p className="muted-line">{request.email} · {request.phone}</p>
                            </div>
                            <span className="contact-date">{formatDate(request.created_at)}</span>
                          </div>
                          <p className="contact-message">
                            <strong>Skills:</strong> {request.skills}
                            <br />
                            {request.message}
                          </p>
                          <div className="card-actions">
                            <button
                              className="nav-btn"
                              type="button"
                              aria-label="Delete volunteer request"
                              onClick={() => deleteVolunteerRequest(request.id)}
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
                      <h3>No volunteer requests yet.</h3>
                      <p>Volunteer submissions will appear here.</p>
                    </div>
                  )}
                </section>
              </div>
            </section>
          )}


          <section className="admin-section">
            <form onSubmit={handleSubmitWorkshop} className="modern-form">
              <h3>Submit a new program</h3>
              <p>
                Logged in as: <strong>{authData.email}</strong>
              </p>
              <select
                value={newWorkshop.type}
                onChange={(e) => setNewWorkshop({ ...newWorkshop, type: e.target.value })}
                required
                style={{
                  width: '100%', borderRadius: '16px', border: '1px solid var(--border)',
                  background: 'var(--bg-strong)', padding: '13px 15px', color: 'var(--text)'
                }}
              >
                <option value="workshop">Live Program</option>
                <option value="event">Community Event</option>
              </select>
              <input
                type="text"
                placeholder="Title"
                value={newWorkshop.title}
                onChange={(e) => setNewWorkshop({ ...newWorkshop, title: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Institute Name or Organizer"
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
              <input
                type="text"
                placeholder="Contact Number"
                value={newWorkshop.contact_no}
                onChange={(e) => setNewWorkshop({ ...newWorkshop, contact_no: e.target.value })}
              />
              <textarea
                placeholder="Description"
                value={newWorkshop.description}
                onChange={(e) => setNewWorkshop({ ...newWorkshop, description: e.target.value })}
                required
              />
              <div className="button-row">
                <button type="submit" className="submit-btn" disabled={isSubmitting} aria-label={isEditing ? 'Update Program' : 'Submit program for review'}>
                  {isSubmitting ? 'Processing...' : isEditing ? 'Update Program' : 'Send for Review'}
                </button>
                {isEditing && (
                  <button
                    type="button"
                    className="nav-btn"
                    aria-label="Cancel program submission"
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
            <h4 style={{ marginBottom: '16px' }}>Quick Links</h4>
            <div className="footer-links">
              <button type="button" aria-label="Scroll to About Us" onClick={() => scrollToSection(aboutRef)}>About Us</button>
              <button type="button" aria-label="Scroll to Live Programs" onClick={() => scrollToSection(programsRef)}>Live Programs</button>
              <button type="button" aria-label="Get in Touch" onClick={() => { setView('home'); setShowContactSection(true); window.setTimeout(() => contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); }}>Get in Touch</button>
            </div>
          </div>
          <div className="footer-contact">
            <h4 style={{ marginBottom: '16px' }}>Get In Touch</h4>
            <p style={{ marginBottom: '8px' }}>Email: adminskilup@gmail.com</p>
            <p>WhatsApp: +91 94217 89605</p>
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

