import React, { useEffect, useMemo, useState } from 'react';

const FALLBACK_NGOS = [
  {
    ein: 'local-1',
    name: 'Bright Future Foundation',
    location: 'Pune, India',
    description: 'Supports digital literacy and youth confidence through practical community workshops.',
    profileUrl: '#',
  },
  {
    ein: 'local-2',
    name: 'HealthBridge NGO',
    location: 'Delhi, India',
    description: 'Builds accessible wellness and public health awareness programs for local families.',
    profileUrl: '#',
  },
  {
    ein: 'local-3',
    name: 'Youth Thrive Trust',
    location: 'Mumbai, India',
    description: 'Runs employability, mentoring, and job-readiness initiatives for emerging professionals.',
    profileUrl: '#',
  },
];

const DiscoverNGOs = ({ apiKey, onCardClick }) => {
  const [ngos, setNgos] = useState(FALLBACK_NGOS);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const fetchNGOs = async () => {
      if (!apiKey) {
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await fetch(`https://partners.every.org/v0.2/search/education?apiKey=${apiKey}`);
        const data = await response.json();

        if (active && Array.isArray(data.nonprofits) && data.nonprofits.length > 0) {
          setNgos(data.nonprofits);
        }
      } catch (fetchError) {
        if (active) {
          setError('Showing curated local partners because the global NGO feed is unavailable.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchNGOs();

    return () => {
      active = false;
    };
  }, [apiKey]);

  const filteredNgos = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return ngos;
    }

    return ngos.filter((ngo) =>
      [ngo.name, ngo.location, ngo.description].filter(Boolean).some((value) => value.toLowerCase().includes(query))
    );
  }, [ngos, searchTerm]);

  return (
    <section className="content-section">
      <div className="section-heading">
        <span className="section-eyebrow">Partner Discovery</span>
        <h2>Explore aligned NGOs</h2>
        <p>Browse a small network of mission-driven organizations and open a quick detail preview.</p>
      </div>

      <div className="program-toolbar">
        <div className="search-filter-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="Search NGOs by name, location, or mission"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <div className="empty-state compact-empty"><p>{error}</p></div>}

      {loading ? (
        <div className="grid-shell">
          {[1, 2, 3].map((item) => (
            <div key={item} className="loading-card" />
          ))}
        </div>
      ) : (
        <div className="grid-shell">
          {filteredNgos.map((ngo) => (
            <article key={ngo.ein} className="program-card">
              <div className="program-card-top">
                <div>
                  <span className="program-pill event">NGO Partner</span>
                  <h3>{ngo.name}</h3>
                  <p className="program-meta">{ngo.location || 'Global'}</p>
                </div>
              </div>
              <p className="program-description">
                {ngo.description || 'Working on community-led impact and accessible support programs.'}
              </p>
              <div className="program-foot">
                <div>
                  <strong>{ngo.profileUrl === '#' ? 'Local profile' : 'External profile'}</strong>
                  <span>{ngo.profileUrl}</span>
                </div>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => onCardClick?.({
                    title: ngo.name,
                    category: 'Partner NGO',
                    location: ngo.location || 'Global',
                    description: ngo.description || 'No description available.',
                    institute_name: ngo.name,
                    profileUrl: ngo.profileUrl,
                  })}
                >
                  View profile
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default DiscoverNGOs;
