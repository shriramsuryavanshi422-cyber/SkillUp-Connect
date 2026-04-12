import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, memo } from 'react';
import './App.css';
import CountUpAnimation from './components/CountUpAnimation';
import SearchFilter from './components/SearchFilter';
import { sendNotification } from './utils/notify';

const API_BASE = `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}/api`;
const ADMIN_EMAIL = 'adminskilup@gmail.com';


const emptyAuth = {
  ngo_name: '',
  email: '',
  password: '',
};

const emptyProgramForm = {
  type: 'workshop',
  title: '',
  category: '',
  date: '',
  location: '',
  description: '',
  institute_name: '',
  contact_no: '',
};

const emptyContactForm = {
  full_name: '',
  email: '',
  subject: '',
  message: '',
};


const defaultStats = {
  workshopsPublished: 0,
  volunteersJoined: 0,
  donationsRaised: 0,
  messagesReceived: 0,
  estimatedLivesTouched: 0,
};

const STARTER_PROGRAMS = [
  { id: 's1', title: 'Full-Stack Web Development', category: 'Technology', event_date: '2026-05-15', location: 'Virtual / Tech Hub', institute_name: 'SkillUp Academy', description: 'Master React, Node, and SQL in this intensive weekend bootcamp designed for career switchers.', status: 'approved' },
  { id: 's2', title: 'Community Health Awareness', category: 'Health', event_date: '2026-05-22', location: 'Metropolitan Hospital', institute_name: 'Global Health NGO', description: 'Essential first-aid training and preventive health tips for community leaders.', status: 'approved' },
  { id: 's3', title: 'Financial Literacy 101', category: 'Finance', event_date: '2026-06-05', location: 'Commerce Center', institute_name: 'Future Mint', description: 'Learn the basics of budgeting, saving, and investing for a secure future.', status: 'approved' },
  { id: 's4', title: 'Creative Writing Workshop', category: 'Arts', event_date: '2026-06-12', location: 'City Library', institute_name: 'Literacy Plus', description: 'Unlock your creative potential and learn the art of storytelling from published authors.', status: 'approved' },
  { id: 's5', title: 'Digital Marketing Mastery', category: 'Business', event_date: '2026-06-18', location: 'Hybrid / Online', institute_name: 'BizGrowth', description: 'Deep dive into SEO, Social Media, and content strategy for small businesses.', status: 'approved' },
  { id: 's6', title: 'Renewable Energy Seminar', category: 'Science', event_date: '2026-07-01', location: 'Green Innovation Lab', institute_name: 'EcoWatch', description: 'Exploring the future of Solar and Wind energy in urban environments.', status: 'approved' },
  { id: 's7', title: 'Leadership & Soft Skills', category: 'Professional', event_date: '2026-07-10', location: 'SkillUp HQ', institute_name: 'Mentor Path', description: 'Hone your delegation, empathy, and strategic thinking for professional growth.', status: 'approved' },
  { id: 's8', title: 'Mobile App Fundamentals', category: 'Technology', event_date: '2026-07-20', location: 'Online Bootcamp', institute_name: 'AppLogic', description: 'Build your first mobile application using cross-platform tools in 3 days.', status: 'approved' }
];

const STARTER_EVENTS = [
  { id: 'e1', title: 'SkillUp Global summit', category: 'Conference', event_date: '2026-08-01', location: 'Main Plaza', badge: 'Featured', description: 'The annual gathering of community leaders, NGOs, and volunteers to share impact stories.' },
  { id: 'e2', title: 'Youth Tech Expo', category: 'Exhibition', event_date: '2026-08-15', location: 'Science Park', badge: 'Tech', description: 'Showcasing the latest innovative projects built by students in our programs.' },
  { id: 'e3', title: 'Community Green Day', category: 'Volunteer', event_date: '2026-09-01', location: 'Central Park', badge: 'Environment', description: 'A massive community planting event to beautify our city and combat climate issues.' },
  { id: 'e4', title: 'Innovation Hackathon', category: 'Coding', event_date: '2026-09-12', location: 'Innovation Lab', badge: 'Hack', description: '48 hours of building solutions for local community challenges.' },
  { id: 'e5', title: 'Arts & Culture Festival', category: 'Culture', event_date: '2026-09-20', location: 'Riverside Walk', badge: 'Cultural', description: 'Celebrating diversity through music, dance, and local art exhibitions.' },
  { id: 'e6', title: 'Entrepreneurship Bootcamp', category: 'Business', event_date: '2026-10-05', location: 'Startup Hive', badge: 'Business', description: 'Pitch your ideas and get mentorship from successful startup founders.' },
  { id: 'e7', title: 'Wellness & Yoga Retreat', category: 'Wellness', event_date: '2026-10-15', location: 'Serenity Gardens', badge: 'Health', description: 'A morning of mindfulness, yoga, and healthy living workshops.' },
  { id: 'e8', title: 'Digital Literacy Marathon', category: 'Education', event_date: '2026-11-01', location: 'District Schools', badge: 'Education', description: 'Empowering seniors and students with essential digital skills across the city.' }
];

const PROGRAM_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'workshop', label: 'Programs' },
  { id: 'event', label: 'Events' },
];

async function fetchJson(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      data = null;
    }

    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Request failed');
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('The request timed out. Please check whether the local API is running.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function formatDate(value) {
  if (!value) {
    return 'To be announced';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'To be announced';
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getProgramDate(item) {
  return item.event_date || item.date || '';
}

function getProgramType(item) {
  return item.type || (item.badge ? 'event' : 'workshop');
}

function isFutureOrToday(value) {
  const selectedDate = new Date(value);
  if (Number.isNaN(selectedDate.getTime())) {
    return false;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return selectedDate.getTime() >= today;
}

function sortByUpcoming(items) {
  return [...items].sort((left, right) => new Date(getProgramDate(left)) - new Date(getProgramDate(right)));
}

const EVERY_ORG_API_KEY = 'pk_live_5b81853be3cf4a431164d767745b376c';

const SectionHeading = memo(({ eyebrow, title, description, align = 'left' }) => {
  return (
    <div className={`section-heading ${align === 'center' ? 'centered' : ''}`}>
      <span className="section-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
});

const ProgramCard = memo(({ item, type, onOpen, onEdit, onDelete, onApprove, canManage, isPending }) => {
  const itemType = type || getProgramType(item);

  return (
    <article
      className={`program-card ${itemType === 'event' ? 'event-card' : ''}`}
      onClick={(e) => {
        if (e.target.closest('.card-actions')) return;
        onOpen(item, itemType);
      }}
      style={{ cursor: 'pointer' }}
    >
      <div className="program-card-top">
        {item.logoUrl && (
          <div className="card-logo-container">
            <img src={item.logoUrl} alt={`${item.name || item.title} logo`} className="card-logo" loading="lazy" onError={(e) => e.target.style.display = 'none'} />
          </div>
        )}
        <div className="card-header-info">
          <span className={`program-pill ${itemType}`}>
            {itemType === 'event' ? 'Community Event' : itemType === 'ngo' ? 'Nonprofit Organization' : 'Live Program'}
          </span>
          <h3>{item.title || item.name}</h3>
          <p className="program-meta">
            {formatDate(getProgramDate(item))} · {item.location}
          </p>
        </div>
      </div>

      <p className="program-description">
        {item.description && item.description.length > 100
          ? item.description.substring(0, 100) + '...'
          : item.description}
      </p>

      <div className="program-foot">
        <div className="card-footer-info">
          <strong>{item.institute_name || item.badge || 'SkillUp Partner'}</strong>
          <span>{item.contact_no || 'Contact shared after confirmation'}</span>
        </div>
        <button type="button" className="ghost-button">
          View details
        </button>
      </div>

      {canManage && (
        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
          {isPending && onApprove && (
            <button
              type="button"
              className="button-primary"
              onClick={(e) => {
                e.stopPropagation();
                onApprove(item.id);
              }}
            >
              Approve
            </button>
          )}
          {onEdit && (
            <button
              type="button"
              className="button-secondary"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item, itemType);
              }}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="button-danger"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id, itemType);
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </article>
  );
});

const DetailModal = memo(({ item, onClose, onContact }) => {
  if (!item) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="detail-modal redesigned" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" aria-label="Close details" onClick={onClose}>
          ×
        </button>

        <div className="modal-header">
          {item.logoUrl && (
            <div className="modal-logo-container">
              <img src={item.logoUrl} alt={`${item.name || item.title} logo`} className="modal-logo" loading="lazy" onError={(e) => e.target.style.display = 'none'} />
            </div>
          )}
          <div className="modal-title-area">
            <span className={`program-pill ${item.type}`}>{item.type === 'event' ? 'Community Event' : item.type === 'ngo' ? 'Nonprofit Organization' : 'Live Program'}</span>
            <h3>{item.title || item.name}</h3>
            <p className="modal-subtitle">
              {formatDate(item.event_date || getProgramDate(item))} · {item.location}
            </p>
          </div>
        </div>

        <div className="modal-body">
          <div className="modal-info-grid">
            <div className="info-box">
              <span className="info-label">Organization</span>
              <strong>{item.institute_name || item.name}</strong>
            </div>
            <div className="info-box">
              <span className="info-label">Category</span>
              <strong>{item.category || 'General'}</strong>
            </div>
            <div className="info-box">
              <span className="info-label">Region</span>
              <strong>{item.location}</strong>
            </div>
            <div className="info-box">
              <span className="info-label">Availability</span>
              <strong>{item.type === 'ngo' ? 'Open' : 'Limited Seats'}</strong>
            </div>
          </div>

          <div className="modal-description">
            <h4>About the Program</h4>
            <p>{item.description || item.mission}</p>
          </div>

          <div className="modal-actions">
            {item.profileUrl ? (
              <a href={item.profileUrl} target="_blank" rel="noopener noreferrer" className="button-primary stretch text-center">
                Visit Website
              </a>
            ) : (
              <button
                type="button"
                className="button-secondary stretch"
                onClick={() => {
                  window.open('https://every.org/search/' + (item.title || item.name || 'skillup'), '_blank');
                }}
              >
                Visit Website (Every.org)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

const ContactModal = memo(({ isOpen, onClose, formData, setFormData, onSubmit, isSubmitting }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="auth-modal contact-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose}>×</button>
        <div className="auth-copy">
          <h3>Get in Touch</h3>
          <p>Send a message to the SkillUp team and we'll get back to you shortly.</p>
        </div>
        <form className="auth-form" onSubmit={onSubmit}>
          <input
            type="text"
            placeholder="Full Name"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Subject"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            required
          />
          <textarea
            placeholder="Your message..."
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            required
            style={{
              width: '100%',
              padding: '14px 18px',
              borderRadius: '18px',
              border: '1px solid rgba(19, 32, 42, 0.09)',
              minHeight: '120px',
              marginBottom: '14px',
              fontFamily: 'inherit'
            }}
          />
          <button type="submit" className="button-primary stretch" disabled={isSubmitting}>
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
});

function App() {
  const [workshops, setWorkshops] = useState([]);
  const [events, setEvents] = useState([]);
  const [, setTestimonials] = useState([]);
  const [impactStats, setImpactStats] = useState(defaultStats);
  const [ngos, setNgos] = useState([]);
  const [pendingPrograms, setPendingPrograms] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [activePrograms, setActivePrograms] = useState([]);
  const [activeEvents, setActiveEvents] = useState([]);
  const [contactMessages, setContactMessages] = useState([]);
  const [volunteerRequests, setVolunteerRequests] = useState([]);

  const [, setStatusMode] = useState('loading');
  const [loading, setLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);


  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authData, setAuthData] = useState(emptyAuth);
  const [contactForm, setContactForm] = useState(emptyContactForm);

  const [programForm, setProgramForm] = useState(emptyProgramForm);
  const [editingTarget, setEditingTarget] = useState(null);
  const [toast, setToast] = useState({ message: '', tone: 'info' });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('skillup-current-user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const toastTimerRef = useRef(null);
  const heroRef = useRef(null);
  const aboutRef = useRef(null);
  const programsRef = useRef(null);

  const systemRef = useRef(null);

  const isAdmin = currentUser?.email === ADMIN_EMAIL || currentUser?.email === 'adminskilup@gmail.com';

  const showToast = useCallback((message, tone = 'info') => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }

    setToast({ message, tone });
    toastTimerRef.current = window.setTimeout(() => {
      setToast({ message: '', tone: 'info' });
    }, 3200);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentUser?.email) {
      setAuthData((previous) => ({
        ...previous,
        email: currentUser.email,
      }));
      localStorage.setItem('skillup-current-user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('skillup-current-user');
    }
  }, [currentUser]);

  const refreshPublicData = useCallback(async () => {
    const responses = await Promise.allSettled([
      fetchJson('/health'),
      fetchJson('/workshops'),
      fetchJson('/events'),
      fetchJson('/impact-stats'),
      fetchJson('/testimonials'),
    ]);

    const [health, workshopResponse, eventResponse, statsResponse, testimonialResponse] = responses;

    if (health.status === 'fulfilled') {
      setStatusMode(health.value.mode || 'online');
    } else {
      setStatusMode('offline');
    }

    if (workshopResponse.status === 'fulfilled') {
      setWorkshops(sortByUpcoming(workshopResponse.value));
    }

    if (eventResponse.status === 'fulfilled') {
      const normalizedEvents = sortByUpcoming(eventResponse.value).map((item) => ({
        ...item,
        type: 'event',
        institute_name: item.badge || 'Community Event',
      }));
      setEvents(normalizedEvents);
    }

    if (statsResponse.status === 'fulfilled') {
      setImpactStats(statsResponse.value);
    }

    if (testimonialResponse.status === 'fulfilled') {
      setTestimonials(testimonialResponse.value);
    }

    const failures = responses.filter((result) => result.status === 'rejected');
    if (failures.length) {
      throw new Error(failures[0].reason?.message || 'Some content could not be loaded.');
    }
  }, []);

  const refreshAdminData = useCallback(async () => {
    if (!isAdmin) {
      return;
    }

    const responses = await Promise.allSettled([
      fetchJson('/admin/pending'),
      fetchJson('/admin/events/pending'),
      fetchJson('/admin/workshops'),
      fetchJson('/events'),
      fetchJson('/contacts'),
      fetchJson('/volunteers'),
    ]);

    const [pendingPResponse, pendingEResponse, workshopsResponse, activeEventsResponse, contactResponse, volunteerResponse] = responses;

    if (pendingPResponse.status === 'fulfilled') {
      setPendingPrograms(sortByUpcoming(pendingPResponse.value));
    }
    if (pendingEResponse.status === 'fulfilled') {
      setPendingEvents(sortByUpcoming(pendingEResponse.value));
    }
    if (workshopsResponse.status === 'fulfilled') {
      setActivePrograms(sortByUpcoming(workshopsResponse.value.filter(p => p.status === 'approved')));
    }
    if (activeEventsResponse.status === 'fulfilled') {
      setActiveEvents(sortByUpcoming(activeEventsResponse.value.filter(e => e.status === 'approved')));
    }

    if (contactResponse.status === 'fulfilled') {
      setContactMessages(contactResponse.value);
    }
    if (volunteerResponse.status === 'fulfilled') {
      setVolunteerRequests(volunteerResponse.value);
    }

    const failures = responses.filter((result) => result.status === 'rejected');
    if (failures.length) {
      throw new Error(failures[0].reason?.message || 'Admin data could not be loaded.');
    }
  }, [isAdmin]);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      setLoading(true);

      try {
        await refreshPublicData();
        if (isAdmin) {
          await refreshAdminData();
        }
      } catch (error) {
        if (active) {
          showToast(error.message, 'error');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, [currentUser?.email, isAdmin, refreshAdminData, refreshPublicData, showToast]);

  useEffect(() => {
    if (!deferredSearchTerm || deferredSearchTerm.length < 3) {
      setNgos([]);
      return;
    }

    let active = true;

    // Debounce: wait 400ms after the user stops typing before hitting the API
    const debounceTimer = window.setTimeout(async () => {
      try {
        const url = `https://partners.every.org/v0.2/search/${encodeURIComponent(deferredSearchTerm)}?apiKey=${EVERY_ORG_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (active && data.nonprofits) {
          setNgos(data.nonprofits.map(n => ({
            ...n,
            type: 'ngo',
            id: n.ein,
            name: n.name,
            institute_name: n.name,
            logoUrl: n.logoUrl || n.logo_url,
            description: n.description || n.mission || 'A committed nonprofit organization.',
            location: 'Global / Online'
          })));
        }
      } catch (err) {
        console.error('Every.org fetch error:', err);
      }
    }, 400);

    return () => {
      active = false;
      window.clearTimeout(debounceTimer);
    };
  }, [deferredSearchTerm]);

  const combinedPrograms = useMemo(() => {
    const livePrograms = workshops.map((item) => ({ ...item, type: 'workshop' }));
    const allLocal = [...livePrograms, ...events];

    // Ensure at least 8 programs (pad with starter data if needed)
    const padded = [...allLocal];
    if (padded.length < 8) {
      const needed = 8 - padded.length;
      padded.push(...STARTER_PROGRAMS.slice(0, needed));
    }

    return sortByUpcoming([...padded, ...ngos]);
  }, [events, workshops, ngos]);

  const filteredPrograms = useMemo(() => {
    const query = deferredSearchTerm.trim().toLowerCase();

    return combinedPrograms.filter((item) => {
      const typeMatches = activeFilter === 'all' || getProgramType(item) === activeFilter;
      if (!typeMatches) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        item.title,
        item.category,
        item.location,
        item.institute_name,
        item.badge,
        item.description,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [activeFilter, combinedPrograms, deferredSearchTerm]);

  const upcomingEvents = useMemo(() => {
    const futureEvents = events.filter((item) => isFutureOrToday(getProgramDate(item)));
    const padded = [...futureEvents];

    if (padded.length < 8) {
      const needed = 8 - padded.length;
      padded.push(...STARTER_EVENTS.slice(0, needed));
    }

    return sortByUpcoming(padded).slice(0, 8);
  }, [events]);

  const scrollToSection = (sectionRef) => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resetProgramForm = () => {
    setProgramForm(emptyProgramForm);
    setEditingTarget(null);
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setIsBusy(true);

    try {
      const path = showRegister ? '/register' : '/login';
      const payload = showRegister
        ? authData
        : { email: authData.email, password: authData.password };

      const response = await fetchJson(path, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (showRegister) {
        showToast('Account created. You can sign in now.', 'success');
        setShowRegister(false);
        setAuthData((previous) => ({ ...previous, password: '' }));
      } else {
        const user = response.user || { email: authData.email, ngo_name: authData.ngo_name };
        setCurrentUser(user);
        showToast(`Welcome back${user.ngo_name ? `, ${user.ngo_name}` : ''}.`, 'success');
        await refreshPublicData();
        if (isAdmin) {
          await refreshAdminData();
        }
        setShowAuthModal(false);
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleEdit = (item, type) => {
    setEditingTarget({ ...item, type });
    setProgramForm({
      type,
      title: item.title || item.name || '',
      institute_name: item.institute_name || item.badge || '',
      category: item.category || '',
      date: item.event_date || getProgramDate(item) || '',
      location: item.location || '',
      description: item.description || item.mission || '',
      contact_no: item.contact_no || '',
    });
    scrollToSection(systemRef);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthData(emptyAuth);
    setContactMessages([]);
    setVolunteerRequests([]);
    setPendingPrograms([]);
    resetProgramForm();
    showToast('You have been signed out.', 'info');
  };

  const handleProgramSubmit = async (event) => {
    event.preventDefault();

    if (!programForm.title.trim() || !programForm.description.trim()) {
      showToast('Please add a title and description.', 'error');
      return;
    }

    if (!programForm.date || !isFutureOrToday(programForm.date)) {
      showToast('Please choose a date that is today or later.', 'error');
      return;
    }

    setIsBusy(true);

    try {
      if (editingTarget?.type === 'event') {
        await fetchJson(`/events/${editingTarget.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            title: programForm.title,
            category: programForm.category,
            event_date: programForm.date,
            location: programForm.location,
            description: programForm.description,
            badge: programForm.institute_name,
            contact_no: programForm.contact_no,
          }),
        });
      } else if (editingTarget?.type === 'workshop') {
        await fetchJson(`/workshops/${editingTarget.id}`, {
          method: 'PUT',
          body: JSON.stringify(programForm),
        });
      } else if (programForm.type === 'event') {
        await fetchJson('/events', {
          method: 'POST',
          body: JSON.stringify({
            title: programForm.title,
            category: programForm.category,
            event_date: programForm.date,
            location: programForm.location,
            description: programForm.description,
            badge: programForm.institute_name,
            contact_no: programForm.contact_no,
          }),
        });
      } else {
        await fetchJson('/workshops', {
          method: 'POST',
          body: JSON.stringify(programForm),
        });
      }

      resetProgramForm();
      showToast(editingTarget ? 'Item updated successfully.' : 'Program submitted successfully.', 'success');

      // Refresh in background
      refreshPublicData();
      refreshAdminData();

      if (!editingTarget && programForm.type === 'workshop') {
        sendNotification({
          type: 'program',
          name: programForm.institute_name,
          email: currentUser?.email || authData.email,
          message: `${programForm.title} scheduled for ${programForm.date} in ${programForm.location}.`,
        }).catch(() => { });
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleContactSubmit = async (event) => {
    event.preventDefault();
    setContactSubmitting(true);

    try {
      const payload = { ...contactForm };
      await fetchJson('/contacts', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showToast('Message sent to the SkillUp team.', 'success');
      setContactForm(emptyContactForm);
      setShowContactModal(false);

      // Refresh in background
      refreshPublicData();
      refreshAdminData();

      sendNotification({
        type: 'contact',
        name: payload.full_name,
        email: payload.email,
        message: `[${payload.subject}] ${payload.message}`,
      }).catch(() => { });
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setContactSubmitting(false);
    }
  };

  const approveItem = async (id, type) => {
    setIsBusy(true);

    try {
      const endpoint = type === 'event' ? `/admin/events/approve/${id}` : `/admin/approve/${id}`;
      await fetchJson(endpoint, {
        method: 'PUT',
      });
      showToast(`${type === 'event' ? 'Event' : 'Program'} approved and published.`, 'success');

      // Refresh in background
      refreshPublicData();
      refreshAdminData();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const deleteItem = async (id, type) => {
    setIsBusy(true);

    try {
      await fetchJson(type === 'event' ? `/events/${id}` : `/workshops/${id}`, {
        method: 'DELETE',
      });
      showToast(`${type === 'event' ? 'Event' : 'Program'} deleted.`, 'success');

      // Refresh in background
      refreshPublicData();
      refreshAdminData();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const deleteContactMessage = async (id) => {
    try {
      await fetchJson(`/contacts/${id}`, { method: 'DELETE' });
      showToast('Contact message deleted.', 'success');
      refreshAdminData();
      refreshPublicData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const deleteVolunteerRequest = async (id) => {
    try {
      await fetchJson(`/volunteers/${id}`, { method: 'DELETE' });
      showToast('Volunteer request deleted.', 'success');
      refreshAdminData();
      refreshPublicData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  // Status label was unused in UI - suppressed to pass linting

  const handleContact = async (item) => {
    try {
      showToast(`Notifying ${item.institute_name || item.name}...`, 'info');
      await sendNotification({
        type: 'contact',
        name: 'Website User',
        email: 'Anonymous / Guest',
        message: `A user expressed interest in your program: ${item.title || item.name}. Please contact the SkillUp team for details.`
      });
      showToast(`Interest sent to ${item.institute_name || item.name}. They will reach out shortly!`, 'success');
    } catch {
      showToast('Notification failed, but the team will be informed.', 'warning');
    }
    setSelectedItem(null);
  };

  return (
    <div className="app-shell">
      {toast.message && <div className={`toast ${toast.tone}`}>{toast.message}</div>}

      <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onContact={handleContact} />

      <ContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        formData={contactForm}
        setFormData={setContactForm}
        onSubmit={handleContactSubmit}
        isSubmitting={contactSubmitting}
      />

      <header className="topbar modern-header">
        <div className="topbar-content">
          <button type="button" className="brand" onClick={() => scrollToSection(heroRef)}>
            <span>SkillUp</span> Connect
          </button>

          <button 
            type="button" 
            className={`mobile-toggle ${mobileMenuOpen ? 'active' : ''}`} 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <nav className={`nav-links modern-nav ${mobileMenuOpen ? 'mobile-active' : ''}`} aria-label="Primary navigation">
            <button type="button" onClick={() => { scrollToSection(aboutRef); setMobileMenuOpen(false); }}>About us</button>
            <button type="button" onClick={() => { scrollToSection(programsRef); setMobileMenuOpen(false); }}>Programs</button>
            
            <div className="mobile-actions">
              {currentUser ? (
                <button type="button" className="button-secondary" onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                  Sign out
                </button>
              ) : (
                <button type="button" className="button-primary" onClick={() => { setShowAuthModal(true); setMobileMenuOpen(false); }}>
                  Login
                </button>
              )}
            </div>
          </nav>

          <div className="topbar-actions desktop-only">
            {currentUser ? (
              <button type="button" className="button-secondary" onClick={handleLogout}>
                Sign out
              </button>
            ) : (
              <button type="button" className="button-primary" onClick={() => setShowAuthModal(true)}>
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="hero-section" ref={heroRef}>
          <div className="hero-copy">
            <span className="hero-kicker">Community action, beautifully organized</span>
            <h1>Helping People Build a Better Future.</h1>
            <p>
              SkillUp Connect brings together people who want to learn and NGOs that want to help.
              We make it easy for you to find workshops, join camps, and gain new skills to improve your life.
            </p>
            <div className="hero-actions">
              <button type="button" className="button-primary" onClick={() => scrollToSection(programsRef)}>
                Explore opportunities
              </button>
            </div>
          </div>
        </section>

        <section className="about-initiative-section" id="about" ref={aboutRef}>
          <div className="initiative-card">
            <div className="initiative-content">
              <span className="section-eyebrow">ABOUT THE INITIATIVE</span>
              <h2>Our Goal: A Stronger Community.</h2>
              <p>
                Many people have talent but don't know where to learn. Foundations like Lighthouse
                and Madhushram have great programs but need a way to reach you. We created this
                platform to connect you directly to these opportunities.
              </p>

              <div className="initiative-numbers">
                <h2>Our Success in Numbers.</h2>
                <p>
                  We are proud to show real results. With over 100 students helped and multiple
                  active programs, we are making a difference every single day.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="content-section" ref={programsRef}>
          <SectionHeading
            eyebrow="Programs"
            title="Search the current lineup"
            description="Browse live workshops and community events through one clean, searchable experience."
          />

          <div className="program-toolbar">
            <SearchFilter
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              placeholder="Search by title, city, category, or organization"
            />
            <div className="filter-group" role="tablist" aria-label="Program filters">
              {PROGRAM_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={activeFilter === filter.id ? 'active' : ''}
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid-shell">
              {[1, 2, 3].map((item) => (
                <div key={item} className="loading-card" />
              ))}
            </div>
          ) : filteredPrograms.length ? (
            <div className="grid-shell">
              {filteredPrograms.map((item) => (
                <ProgramCard
                  key={`${getProgramType(item)}-${item.id}`}
                  item={item}
                  onOpen={(program, type) =>
                    setSelectedItem({
                      ...program,
                      type,
                      event_date: getProgramDate(program),
                      institute_name: program.institute_name || program.badge || 'SkillUp Partner',
                    })
                  }
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>No matches found</h3>
              <p>Try a different search or clear the current filter to see more opportunities.</p>
            </div>
          )}
        </section>

        <section className="highlight-section">
          <div className="highlight-card">
            <SectionHeading
              eyebrow="Upcoming"
              title="Community events worth spotlighting"
              description="A quick-glance list of public events that deserve extra visibility."
            />
            <div className="event-rail">
              {upcomingEvents.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="event-row"
                  onClick={() => setSelectedItem({ ...item, event_date: getProgramDate(item), type: 'event' })}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.location}</span>
                  </div>
                  <small>{formatDate(getProgramDate(item))}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="highlight-card contrast">
            <SectionHeading
              eyebrow="Our Impact"
              title="Growing together as a network"
              description="Real-time transparency of the community growth we've achieved through collaboration."
            />
            <div className="impact-grid">
              <div className="impact-stat">
                <strong><CountUpAnimation target={impactStats.workshopsPublished} /></strong>
                <span>Programs Published</span>
              </div>
              <div className="impact-stat">
                <strong><CountUpAnimation target={impactStats.volunteersJoined} /></strong>
                <span>Active Volunteers</span>
              </div>
              <div className="impact-stat">
                <strong><CountUpAnimation target={impactStats.donationsRaised} prefix="₹" /></strong>
                <span>Donations Raised</span>
              </div>
              <div className="impact-stat">
                <strong><CountUpAnimation target={impactStats.estimatedLivesTouched} suffix="+" /></strong>
                <span>Lives Touched</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {currentUser && (
        <div className="management-area">
          {/* Administrator Dashboard Section Removed */}

          <section className="portal-section system-workspace-section" id="system-workspace" ref={systemRef}>
            <SectionHeading
              eyebrow="System Workspace"
              title={editingTarget ? 'Edit Opportunity' : 'Submit New Opportunity'}
              description="Provide the details for your new program or community event to be published on the platform."
            />
            <div className="workspace-box">
              <div className="portal-card submission-card">
                <form className="feature-form grid-form" onSubmit={handleProgramSubmit}>
                  {isAdmin && (
                    <div className="form-group span-full">
                      <label>Entry Type</label>
                      <select
                        value={programForm.type}
                        onChange={(event) => setProgramForm({ ...programForm, type: event.target.value })}
                      >
                        <option value="workshop">Live Program</option>
                        <option value="event">Community Event</option>
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Digital Literacy Sprint"
                      value={programForm.title}
                      onChange={(event) => setProgramForm({ ...programForm, title: event.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>{programForm.type === 'event' ? 'Organizer name' : 'Institute/NGO name'}</label>
                    <input
                      type="text"
                      placeholder="e.g. Bright Future NGO"
                      value={programForm.institute_name}
                      onChange={(event) => setProgramForm({ ...programForm, institute_name: event.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Technology, Health"
                      value={programForm.category}
                      onChange={(event) => setProgramForm({ ...programForm, category: event.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Scheduled Date</label>
                    <input
                      type="date"
                      value={programForm.date}
                      onChange={(event) => setProgramForm({ ...programForm, date: event.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai Centre, Hybrid"
                      value={programForm.location}
                      onChange={(event) => setProgramForm({ ...programForm, location: event.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Contact Number (Optional)</label>
                    <input
                      type="text"
                      placeholder="+91 00000 00000"
                      value={programForm.contact_no}
                      onChange={(event) => setProgramForm({ ...programForm, contact_no: event.target.value })}
                    />
                  </div>

                  <div className="form-group span-full">
                    <label>Description</label>
                    <textarea
                      placeholder="Describe the opportunity, target audience, and key benefits..."
                      value={programForm.description}
                      onChange={(event) => setProgramForm({ ...programForm, description: event.target.value })}
                      required
                    />
                  </div>

                  <div className="form-actions span-full">
                    <button type="submit" className="button-primary">
                      {editingTarget ? 'Update item' : programForm.type === 'event' ? 'Publish event' : 'Submit for review'}
                    </button>
                    {editingTarget && (
                      <button type="button" className="button-secondary" onClick={resetProgramForm}>
                        Cancel edit
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </section>

          {isAdmin && (
            <section className="portal-section admin-management-section" id="admin-management">
              <SectionHeading
                eyebrow="Management"
                title="Admin Management"
                description="Review pending community submissions and manage live content across the platform."
              />

              <div className="admin-grid-layout">
                <div className="admin-column">
                  <div className="column-header">
                    <h4>Pending approvals</h4>
                    <span className="count-badge">{pendingPrograms.length}</span>
                  </div>
                  <div className="column-content">
                    {pendingPrograms.length || pendingEvents.length ? (
                      <>
                        {pendingPrograms.map((item) => (
                          <ProgramCard
                            key={`pending-p-${item.id}`}
                            item={{ ...item, type: 'workshop' }}
                            type="workshop"
                            canManage
                            isPending
                            onOpen={(program, type) =>
                              setSelectedItem({
                                ...program,
                                type,
                                event_date: getProgramDate(program),
                                institute_name: program.institute_name || 'SkillUp Partner',
                              })
                            }
                            onApprove={(id) => approveItem(id, 'workshop')}
                            onEdit={handleEdit}
                            onDelete={deleteItem}
                          />
                        ))}
                        {pendingEvents.map((item) => (
                          <ProgramCard
                            key={`pending-e-${item.id}`}
                            item={{ ...item, type: 'event', institute_name: item.badge }}
                            type="event"
                            canManage
                            isPending
                            onOpen={(program, type) =>
                              setSelectedItem({
                                ...program,
                                type,
                                event_date: getProgramDate(program),
                                institute_name: program.badge || 'Community Event',
                              })
                            }
                            onApprove={(id) => approveItem(id, 'event')}
                            onEdit={handleEdit}
                            onDelete={deleteItem}
                          />
                        ))}
                      </>
                    ) : (
                      <div className="empty-state-small">No programs awaiting review.</div>
                    )}
                  </div>
                </div>

                <div className="admin-column">
                  <div className="column-header">
                    <h4>Active Programs & Events</h4>
                    <span className="count-badge">{activePrograms.length + activeEvents.length}</span>
                  </div>
                  <div className="column-content">
                    {activePrograms.map(p => (
                      <ProgramCard
                        key={`active-p-${p.id}`}
                        item={{ ...p, type: 'workshop' }}
                        canManage
                        onOpen={(item) => setSelectedItem({ ...item, type: 'workshop', event_date: getProgramDate(item) })}
                        onEdit={handleEdit}
                        onDelete={deleteItem}
                      />
                    ))}
                    {activeEvents.map(e => (
                      <ProgramCard
                        key={`active-e-${e.id}`}
                        item={{ ...e, type: 'event', institute_name: e.badge }}
                        canManage
                        onOpen={(item) => setSelectedItem({ ...item, type: 'event', event_date: getProgramDate(item) })}
                        onEdit={handleEdit}
                        onDelete={deleteItem}
                      />
                    ))}
                    {!activePrograms.length && !activeEvents.length && (
                      <div className="empty-state-small">No active content published.</div>
                    )}
                  </div>
                </div>

                <div className="admin-column">
                  <div className="column-header">
                    <h4>Inboxes (Messages & Volunteers)</h4>
                    <span className="count-badge">{contactMessages.length + volunteerRequests.length}</span>
                  </div>
                  <div className="column-content">
                    {contactMessages.map((m) => (
                      <div key={`msg-${m.id}`} className="admin-message-card">
                        <div className="message-header">
                          <strong>{m.full_name}</strong>
                          <span className="message-type">Inquiry</span>
                        </div>
                        <p>{m.subject}</p>
                        <div className="message-actions">
                          <button type="button" className="ghost-button-danger" onClick={() => deleteContactMessage(m.id)}>Delete</button>
                        </div>
                      </div>
                    ))}
                    {volunteerRequests.map((v) => (
                      <div key={`vol-${v.id}`} className="admin-message-card">
                        <div className="message-header">
                          <strong>{v.full_name}</strong>
                          <span className="message-type volunteer">Volunteer</span>
                        </div>
                        <p>Applied for skills: {v.skills}</p>
                        <div className="message-actions">
                          <button type="button" className="ghost-button-danger" onClick={() => deleteVolunteerRequest(v.id)}>Delete</button>
                        </div>
                      </div>
                    ))}
                    {!contactMessages.length && !volunteerRequests.length && (
                      <div className="empty-state-small">Your inbox is clear.</div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {showAuthModal && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowAuthModal(false)}>×</button>
            <div className="auth-copy">
              <h3>{showRegister ? 'Register' : 'Sign In'}</h3>
              <p>{showRegister ? 'Create your account to get started.' : 'Welcome back! Please enter your details.'}</p>
            </div>
            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {showRegister && (
                <input
                  type="text"
                  placeholder="Organization Name"
                  value={authData.ngo_name}
                  onChange={(e) => setAuthData({ ...authData, ngo_name: e.target.value })}
                  required
                />
              )}
              <input
                type="email"
                placeholder="Email Address"
                value={authData.email}
                onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                required
              />
              <div className="password-wrap" style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={authData.password}
                  onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                  required
                  style={{ paddingRight: '45px' }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '15px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    padding: '5px'
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <button type="submit" className="button-primary stretch" disabled={isBusy}>
                {showRegister ? 'Register' : 'Login'}
              </button>
            </form>
            <button type="button" className="inline-switch" onClick={() => setShowRegister(!showRegister)}>
              {showRegister ? 'Already have an account? Sign in.' : 'Need an NGO account? Register.'}
            </button>
          </div>
        </div>
      )}

      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <strong>SkillUp Connect</strong>
            <p>Empowering local communities through organized upskilling and collaboration.</p>
          </div>

          <div className="footer-contact">
            <h4>Contact Details</h4>
            <p><strong>Admin Email:</strong> {ADMIN_EMAIL}</p>
            <p><strong>Support:</strong> +91 91234 56789</p>
          </div>

          <div className="footer-links">
            <h4>Quick Links</h4>
            <button type="button" onClick={() => scrollToSection(programsRef)}>Programs</button>
            <button type="button" onClick={() => setShowContactModal(true)}>Get in Touch</button>
            {!currentUser && <button type="button" onClick={() => setShowAuthModal(true)}>Login</button>}
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} SkillUp Connect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;



