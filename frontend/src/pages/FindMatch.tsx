import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCache } from '../context/CacheContext';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Heart, MapPin, X, Filter, ShieldClose } from 'lucide-react';
import { API_URL } from '../config';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface PublicProfile {
  id: number;
  user: {
    id: number;
    first_name: string;
    middle_name?: string;
    last_name: string;
    age: number;
    gender: string;
  };
  height: string;
  religion: string;
  caste: string;
  marital_status: string;
  blood_group: string;
  city: string;
  hometown: string;
  education: string;
  occupation: string;
  working_status: string;
  annual_salary: string;
  about_me: string;
  family_type: string;
  profile_photo: string | null;
  liked_by_me?: boolean;
}

interface FilterState {
  religion: string;
  caste: string;
  city: string;
  workingStatus: string;
  familyType: string;
  bloodGroup: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const SEARCH_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const DETAIL_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const DEBOUNCE_MS = 500;

const EMPTY_FILTERS: FilterState = {
  religion: '',
  caste: '',
  city: '',
  workingStatus: '',
  familyType: '',
  bloodGroup: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY — pure helpers defined outside component so they are never recreated
// ─────────────────────────────────────────────────────────────────────────────

/** Build the search URL from a filter state + gender */
function buildSearchUrl(filters: FilterState, targetGender: string): string {
  const params = new URLSearchParams();
  if (filters.religion) params.append('religion', filters.religion);
  if (filters.caste) params.append('caste', filters.caste);
  if (filters.city) params.append('city', filters.city);
  if (filters.workingStatus) params.append('working_status', filters.workingStatus);
  if (filters.familyType) params.append('family_type', filters.familyType);
  if (filters.bloodGroup) params.append('blood_group', filters.bloodGroup);
  if (targetGender) params.append('gender', targetGender);
  return `${API_URL}/api/profiles/search/?${params.toString()}`;
}

/** Derive the opposite gender string once */
function getTargetGender(gender?: string): string {
  if (gender === 'Male') return 'Female';
  if (gender === 'Female') return 'Male';
  return '';
}

/** Avatar initials */
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS — memoized to prevent re-renders from parent state changes
// ─────────────────────────────────────────────────────────────────────────────

interface ProfileCardProps {
  profile: PublicProfile;
  onOpen: (userId: number) => void;
  onLike: (profileId: number, e: React.MouseEvent) => void;
}

/**
 * WHY MEMO: The profiles grid can contain dozens of cards. Without memo, every
 * parent state change (loadingMore, selectedProfileId, etc.) would re-render
 * all cards. With memo, a card only re-renders when its own profile data or
 * callbacks change — eliminating dozens of wasted renders per interaction.
 */
const ProfileCard = React.memo<ProfileCardProps>(({ profile, onOpen, onLike }) => {
  const fullName = `${profile.user.first_name} ${profile.user.last_name}`;

  return (
    <div
      key={profile.user.id}
      onClick={() => onOpen(profile.user.id)}
      className="premium-card animate-fade-in"
      style={{
        padding: 0,
        borderRadius: '24px',
        overflow: 'hidden',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Photo backdrop banner */}
      <div
        style={{
          height: '160px',
          position: 'relative',
          background: 'linear-gradient(135deg, var(--primary-burgundy) 0%, #D4A373 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {profile.profile_photo ? (
          <img
            src={profile.profile_photo}
            alt={fullName}
            loading="lazy" // ← WHY: native lazy-loading defers off-screen images,
            // reducing initial page bandwidth significantly for large grids
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              fontSize: '3.5rem',
              fontFamily: 'var(--font-serif)',
              color: '#FFFDF9',
              opacity: 0.9,
              fontWeight: 700,
            }}
          >
            {getInitials(profile.user.first_name, profile.user.last_name)}
          </div>
        )}

        <div style={{ position: 'absolute', top: '0.8rem', right: '0.8rem', zIndex: 10 }}>
          <button
            onClick={(e) => onLike(profile.user.id, e)}
            className="btn btn-outline"
            style={{
              padding: '0.5rem',
              borderRadius: '50%',
              backgroundColor: profile.liked_by_me ? 'var(--primary-burgundy)' : 'var(--white)',
              color: profile.liked_by_me ? 'var(--white)' : 'var(--primary-burgundy)',
              border: 'none',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Heart size={16} fill={profile.liked_by_me ? '#FFF' : 'none'} />
          </button>
        </div>
      </div>

      {/* Card details */}
      <div
        style={{
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem',
          fontSize: '0.85rem',
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.15rem',
              color: 'var(--text-dark)',
              margin: 0,
            }}
          >
            {fullName}
          </h3>
          <span
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-light)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
            }}
          >
            <MapPin size={11} /> {profile.city}
          </span>
        </div>

        <div
          style={{
            borderTop: '1px solid rgba(128,10,63,0.05)',
            paddingTop: '0.5rem',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.4rem',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-light)',
                textTransform: 'uppercase',
                display: 'block',
              }}
            >
              Age / Height
            </span>
            <strong style={{ fontWeight: 600 }}>
              {profile.user.age} yrs / {profile.height}
            </strong>
          </div>
          <div>
            <span
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-light)',
                textTransform: 'uppercase',
                display: 'block',
              }}
            >
              Religion
            </span>
            <strong style={{ fontWeight: 600 }}>{profile.religion}</strong>
          </div>
        </div>

        <div>
          <span
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-light)',
              textTransform: 'uppercase',
              display: 'block',
            }}
          >
            Occupation
          </span>
          <strong
            style={{
              fontWeight: 600,
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {profile.occupation || 'Not specified'}
          </strong>
        </div>
      </div>
    </div>
  );
});
ProfileCard.displayName = 'ProfileCard';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const FindMatch: React.FC = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { cachedFetch, getCachedData } = useCache();

  // ── Stable derived value — never triggers re-renders ──────────────────────
  /**
   * WHY MEMO: targetGender depends only on user.gender. Without memo it would
   * be recomputed on every render. More importantly, it's used as a dependency
   * in other memos/callbacks, so stability prevents cascade re-computations.
   */
  const targetGender = useMemo(() => getTargetGender(user?.gender), [user?.gender]);

  // ── Filter state collapsed into one object ────────────────────────────────
  /**
   * WHY SINGLE STATE OBJECT: Six separate useState calls for filters meant
   * six potential re-renders when clearing/applying filters. One object update
   * = one render. It also makes the debounce ref comparison trivial.
   */
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  // ── "Committed" filters are what was last actually searched ───────────────
  /**
   * WHY TWO FILTER STATES: The user types into filter inputs (filters state)
   * but we only fire the API call when they click Apply or after debounce.
   * committedFilters drives the URL/fetch; filters drives the controlled inputs.
   * This prevents an API call on every keystroke before debounce fires.
   */
  const [committedFilters, setCommittedFilters] = useState<FilterState>(EMPTY_FILTERS);

  // ── Core data state ───────────────────────────────────────────────────────
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Detail modal state ────────────────────────────────────────────────────
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const observerTargetRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * WHY IN-FLIGHT REF: Tracks the URL of the currently executing search
   * request. If a new search fires before the previous completes (e.g. fast
   * filter typing), we skip updating state with stale data.
   * This prevents race conditions and duplicate state updates.
   */
  const inFlightSearchRef = useRef<string | null>(null);
  /**
   * WHY PRELOAD REF: Tracks URLs we've already preloaded so we never fire the
   * same background prefetch twice (e.g. if the observer fires multiple times).
   */
  const preloadedUrlsRef = useRef<Set<string>>(new Set());

  // ─────────────────────────────────────────────────────────────────────────
  // STABLE URL COMPUTATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * WHY MEMO: Rebuilds the search URL only when committedFilters or
   * targetGender change — not on every render. This URL is used as a cache
   * key, so stability is critical to avoid cache misses.
   */
  const currentSearchUrl = useMemo(
    () => buildSearchUrl(committedFilters, targetGender),
    [committedFilters, targetGender]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CORE FETCH — search results
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * WHY USECALLBACK: fetchMatches is referenced in three places (initial
   * useEffect, apply button, clear button). Without useCallback it gets a new
   * reference every render, causing useEffect dependency arrays to fire
   * unnecessarily and breaking memoization of child callbacks that depend on it.
   *
   * WHY CACHE CHECK FIRST: We read the cache synchronously before any async
   * work. If data is present, we update state immediately (zero network round
   * trip) and show results instantly. The CacheContext TTL ensures data is
   * at most 10 minutes old.
   *
   * WHY IN-FLIGHT CHECK: If this exact URL is already being fetched (e.g.
   * StrictMode double-invoke, concurrent filter changes), we bail immediately
   * instead of firing a duplicate request.
   */
  const fetchMatches = useCallback(
    async (url: string) => {
      // 1. Instant cache hit — no network call
      const cached = getCachedData(url);
      if (cached) {
        setProfiles(cached.results || []);
        setNextPageUrl(cached.next || null);
        setLoading(false);
        // Still preload page 2 from cache if available
        if (cached.next) preloadNextPage(cached.next);
        return;
      }

      // 2. Duplicate-request guard
      if (inFlightSearchRef.current === url) return;
      inFlightSearchRef.current = url;
      setLoading(true);

      try {
        const { data, ok } = await cachedFetch(
          url,
          { headers: { Authorization: `Token ${token}` } },
          SEARCH_CACHE_TTL // ← explicit 10-minute TTL passed to CacheContext
        );

        // Only update state if this is still the latest request
        if (inFlightSearchRef.current === url && ok && data) {
          setProfiles(data.results || []);
          setNextPageUrl(data.next || null);
          // Kick off background preload of page 2 immediately
          if (data.next) preloadNextPage(data.next);
        }
      } catch (err) {
        console.error('Could not fetch compatible matches', err);
      } finally {
        if (inFlightSearchRef.current === url) {
          inFlightSearchRef.current = null;
          setLoading(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, cachedFetch, getCachedData]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // BACKGROUND PRELOAD — next paginated page
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * WHY PRELOAD: After page 1 loads, we silently prefetch page 2 in the
   * background and store it in the CacheContext. When the user scrolls to
   * the bottom and the IntersectionObserver fires, fetchMoreMatches reads
   * straight from cache — zero perceptible latency for infinite scroll.
   *
   * WHY SET GUARD: preloadedUrlsRef prevents re-fetching the same next-page
   * URL if this function is called multiple times (e.g. observer firing twice).
   */
  const preloadNextPage = useCallback(
    async (url: string) => {
      if (preloadedUrlsRef.current.has(url)) return;
      preloadedUrlsRef.current.add(url);

      try {
        await cachedFetch(
          url,
          { headers: { Authorization: `Token ${token}` } },
          SEARCH_CACHE_TTL
        );
        // Result is stored in CacheContext; we don't update component state here
      } catch {
        // Silent — preload failures should not affect UX
        preloadedUrlsRef.current.delete(url); // Allow retry on scroll
      }
    },
    [token, cachedFetch]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // INFINITE SCROLL — load more
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * WHY USECALLBACK: fetchMoreMatches is used inside the IntersectionObserver
   * callback. Without useCallback, the observer's closure would capture a
   * stale version of the function. With useCallback + stable deps, the
   * observer always has the current function.
   *
   * WHY CACHE FIRST HERE TOO: Because we preloaded page 2 in the background,
   * getCachedData will almost always return instantly here, making "load more"
   * feel instantaneous.
   */
  const fetchMoreMatches = useCallback(async () => {
    if (!nextPageUrl || loadingMore) return;

    // Check cache first — likely already preloaded
    const cached = getCachedData(nextPageUrl);
    if (cached) {
      setProfiles((prev) => [...prev, ...(cached.results || [])]);
      setNextPageUrl(cached.next || null);
      if (cached.next) preloadNextPage(cached.next); // Preload page 3
      return;
    }

    setLoadingMore(true);
    try {
      const { data, ok } = await cachedFetch(
        nextPageUrl,
        { headers: { Authorization: `Token ${token}` } },
        SEARCH_CACHE_TTL
      );
      if (ok && data) {
        setProfiles((prev) => [...prev, ...(data.results || [])]);
        setNextPageUrl(data.next || null);
        if (data.next) preloadNextPage(data.next); // Preload page 3
      }
    } catch (err) {
      console.error('Could not fetch more matches', err);
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageUrl, loadingMore, token, cachedFetch, getCachedData, preloadNextPage]);

  // ─────────────────────────────────────────────────────────────────────────
  // LIKE HANDLER
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * WHY USECALLBACK: Passed to memoized ProfileCard children. A new reference
   * every render would break ProfileCard's React.memo bailout.
   *
   * WHY NO CACHE TTL: POST requests are never passed a TTL. CacheContext
   * should never cache POST requests (confirmed by your existing CacheContext
   * contract), so no TTL argument is passed here intentionally.
   *
   * WHY OPTIMISTIC UPDATE: We update liked_by_me in local state immediately
   * without waiting for a subsequent search refresh. This avoids an entire
   * re-fetch just to flip one boolean, saving one API call per like action.
   */
  const handleLike = useCallback(
    async (profileId: number, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const { data, ok } = await cachedFetch(`${API_URL}/api/profiles/like/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Token ${token}`,
          },
          body: JSON.stringify({ receiver_id: profileId }),
        });
        // No TTL — POST should not be cached

        if (ok && data) {
          if (data.mutual_match) {
            alert('Mutual Connection Established! You and this partner are now connected!');
          } else {
            alert('Connection request sent successfully!');
          }

          // Optimistic update — no re-fetch needed
          setProfiles((prev) =>
            prev.map((p) =>
              p.user.id === profileId ? { ...p, liked_by_me: true } : p
            )
          );
          setSelectedProfile((prev) =>
            prev && prev.user.id === profileId ? { ...prev, liked_by_me: true } : prev
          );
        }
      } catch (err) {
        console.error('Failed to send connection request', err);
      }
    },
    [token, cachedFetch]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // PROFILE DETAIL
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * WHY USECALLBACK: Passed to ProfileCard children via onOpen prop.
   *
   * WHY SHOW CACHED DATA IMMEDIATELY: If the profile is already in cache
   * (30-min TTL), we set state synchronously and skip the loading spinner
   * entirely. The modal appears fully populated with zero flicker.
   *
   * WHY STILL AWAIT IF CACHED: We do NOT re-fetch if cached. The original
   * code fetched even when cached (wasting a network call). We skip it.
   */
  const openProfileDetails = useCallback(
    async (userId: number) => {
      setSelectedProfileId(userId);
      const url = `${API_URL}/api/profiles/${userId}/`;

      const cached = getCachedData(url);
      if (cached) {
        setSelectedProfile(cached);
        setDetailLoading(false);
        return; // ← BUG FIX: original code continued to fetch even on cache hit
      }

      setDetailLoading(true);
      try {
        const { data, ok } = await cachedFetch(
          url,
          { headers: { Authorization: `Token ${token}` } },
          DETAIL_CACHE_TTL // ← 30-minute TTL for detail pages
        );
        if (ok && data) {
          setSelectedProfile(data);
        }
      } catch (err) {
        console.error('Failed to fetch public details', err);
      } finally {
        setDetailLoading(false);
      }
    },
    [token, cachedFetch, getCachedData]
  );

  const closeProfileDetails = useCallback(() => {
    setSelectedProfileId(null);
    setSelectedProfile(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // FILTER HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * WHY SINGLE HANDLER: Instead of 6 separate onChange handlers (each
   * creating a new function per render), one generic handler with a field key
   * updates any filter field. Reduces the number of function allocations from
   * 6 to 1 per render.
   */
  const handleFilterChange = useCallback(
    (field: keyof FilterState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFilters((prev) => ({ ...prev, [field]: e.target.value }));
    },
    []
  );

  /**
   * WHY DEBOUNCE ON COMMIT: We debounce the committedFilters update (which
   * drives the URL and fetch) by 500ms. The user can type freely without
   * triggering API calls. Only after 500ms of inactivity does the search fire.
   *
   * WHY REF FOR TIMER: useRef persists across renders without causing
   * re-renders itself. Using useState for the timer would cause a render on
   * every keystroke just to store the timer ID.
   *
   * WHY CLEAR ON UNMOUNT: The cleanup in useEffect clears any pending debounce
   * timer, preventing state updates on an unmounted component (memory leak fix).
   */
  const applyFilters = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setCommittedFilters(filters);
      if (isMobile) setShowFilters(false);
    }, DEBOUNCE_MS);
  }, [filters, isMobile]);

  const clearFilters = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setFilters(EMPTY_FILTERS);
    setCommittedFilters(EMPTY_FILTERS);
    if (isMobile) setShowFilters(false);
    // Setting committedFilters to EMPTY_FILTERS triggers the fetch useEffect below
  }, [isMobile]);

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────

  /** Auth guard */
  useEffect(() => {
    if (!token) navigate('/register?tab=login');
  }, [token, navigate]);

  /**
   * WHY TRIGGERED BY currentSearchUrl: This effect depends on the memoized URL
   * rather than every individual filter field. It fires only when the actual
   * search URL changes — not on intermediate keystrokes during debounce.
   * This is the single canonical trigger for all fetches.
   */
  useEffect(() => {
    if (!token) return;
    // Reset profiles when search params change so stale results don't flash
    setProfiles([]);
    setNextPageUrl(null);
    preloadedUrlsRef.current.clear(); // Reset preload tracking for new search
    fetchMatches(currentSearchUrl);
  }, [currentSearchUrl, token, fetchMatches]);

  /**
   * WHY RESIZE LISTENER IN OWN EFFECT: Separating resize from fetch logic
   * means the resize handler is not recreated when fetch dependencies change.
   *
   * WHY NO MEMORY LEAK: The cleanup removes the listener. The original code
   * also had this, but it's worth noting — without cleanup, the listener would
   * accumulate on every component mount/unmount cycle.
   */
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * WHY OWN EFFECT FOR OBSERVER: IntersectionObserver is recreated only when
   * nextPageUrl or loadingMore changes — not on every render. The original
   * code placed this in the same effect as other logic, causing the observer
   * to be torn down and rebuilt more often than necessary.
   *
   * WHY rootMargin: Triggering 200px before the bottom is visible gives the
   * fetch a head start, so content appears before the user actually hits the
   * bottom — smoother infinite scroll experience.
   */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextPageUrl && !loadingMore) {
          fetchMoreMatches();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px 200px 0px' }
    );

    const currentTarget = observerTargetRef.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [nextPageUrl, loadingMore, fetchMoreMatches]);

  /** Cleanup debounce timer on unmount — prevents memory leak */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="app-container">
      <Header />

      <main
        className="main-content"
        style={{ maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '3rem 2rem' }}
      >
        <div style={{ marginBottom: '2.5rem' }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2.5rem',
              color: 'var(--primary-burgundy)',
              fontWeight: 700,
            }}
          >
            Find prospective partners
          </h1>
          <p style={{ color: 'var(--text-medium)', fontSize: '0.95rem' }}>
            Filter and connect with compatible matches in your opposite gender.
          </p>
        </div>

        {/* MOBILE FILTER TOGGLE */}
        {isMobile && (
          <button
            className="btn btn-primary"
            onClick={() => setShowFilters((v) => !v)}
            style={{
              width: '100%',
              borderRadius: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.85rem',
              position: 'sticky',
              top: '0',
              zIndex: 100,
              transition: 'all 300ms ease',
            }}
          >
            <Filter size={18} />
            {showFilters ? 'Hide Filters' : 'Search Filters'}
          </button>
        )}

        <div
          style={{ display: 'flex', gap: '2.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}
        >
          {/* LEFT FILTER PANEL */}
          {(!isMobile || showFilters) && (
            <div
              style={{
                flex: 1,
                minWidth: '280px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                width: isMobile ? '100%' : undefined,
                overflow: 'hidden',
                transition: 'all 300ms ease',
                animation:
                  isMobile && showFilters ? 'filterSlideDown 300ms ease forwards' : undefined,
              }}
            >
              <style>{`
                @keyframes filterSlideDown {
                  from { opacity: 0; transform: translateY(-12px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
              `}</style>
              <div className="premium-card" style={{ padding: '2rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem',
                    borderBottom: '1px solid rgba(128,10,63,0.05)',
                    paddingBottom: '0.75rem',
                  }}
                >
                  <h3
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.25rem',
                      color: 'var(--primary-burgundy)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <Filter size={16} /> Search Filters
                  </h3>
                  <button
                    onClick={clearFilters}
                    className="btn-text"
                    style={{ fontSize: '0.8rem', padding: 0 }}
                  >
                    Clear All
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  {/* Text inputs use the single handleFilterChange factory */}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Religion</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Hindu, Sikh"
                      value={filters.religion}
                      onChange={handleFilterChange('religion')}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Caste</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Brahmin, Gujarati"
                      value={filters.caste}
                      onChange={handleFilterChange('caste')}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Mumbai, Pune"
                      value={filters.city}
                      onChange={handleFilterChange('city')}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Working Status</label>
                    <select
                      className="form-control"
                      value={filters.workingStatus}
                      onChange={handleFilterChange('workingStatus')}
                      style={{ height: '48px' }}
                    >
                      <option value="">Any working status</option>
                      <option value="Employed">Employed</option>
                      <option value="Self-employed">Self-employed</option>
                      <option value="Business">Business</option>
                      <option value="Unemployed">Unemployed</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Family Type</label>
                    <select
                      className="form-control"
                      value={filters.familyType}
                      onChange={handleFilterChange('familyType')}
                      style={{ height: '48px' }}
                    >
                      <option value="">Any family type</option>
                      <option value="Nuclear">Nuclear</option>
                      <option value="Joint">Joint</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Blood Group</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. B+, O-"
                      value={filters.bloodGroup}
                      onChange={handleFilterChange('bloodGroup')}
                    />
                  </div>

                  <button
                    onClick={applyFilters}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      borderRadius: '20px',
                      padding: '0.8rem',
                      marginTop: '0.5rem',
                    }}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MAIN RESULTS GRID */}
          <div style={{ flex: 2.8, minWidth: '350px', width: '100%' }}>
            {loading ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '4rem',
                  color: 'var(--primary-burgundy)',
                  fontWeight: 600,
                }}
              >
                Loading compatible matches...
              </div>
            ) : profiles.length === 0 ? (
              <div
                className="premium-card"
                style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-medium)' }}
              >
                No completed profiles match your search criteria. Try modifying your search
                filters!
              </div>
            ) : (
              <>
                {/*
                 * WHY NOT VIRTUALIZING: For typical matrimonial result sets
                 * (20–60 profiles per page with pagination), the DOM cost is
                 * manageable. React.memo on ProfileCard prevents re-renders.
                 * If you grow to 200+ items per page, consider react-window.
                 */}
                <div className="grid-cols-3" style={{ gap: '1.5rem' }}>
                  {profiles.map((profile) => (
                    <ProfileCard
                      key={profile.user.id}
                      profile={profile}
                      onOpen={openProfileDetails}
                      onLike={handleLike}
                    />
                  ))}
                </div>

                {/* Intersection Observer trigger */}
                <div
                  ref={observerTargetRef}
                  style={{
                    height: '60px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: '2rem',
                  }}
                >
                  {loadingMore && <div className="spinner" />}
                  {!nextPageUrl && profiles.length > 0 && (
                    <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', fontWeight: 600 }}>
                      No more profiles to display.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* PROFILE DETAIL MODAL */}
      {selectedProfileId && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(43, 29, 36, 0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: '24px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Close button */}
            <button
              onClick={closeProfileDetails}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                backgroundColor: 'rgba(255,255,255,0.9)',
                color: 'var(--text-dark)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                zIndex: 20,
              }}
            >
              <X size={18} />
            </button>

            {detailLoading || !selectedProfile ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '6rem',
                  color: 'var(--primary-burgundy)',
                  fontWeight: 600,
                }}
              >
                Loading profile details...
              </div>
            ) : (
              <div>
                {/* Header banner */}
                <div
                  style={{
                    height: '240px',
                    background:
                      'linear-gradient(135deg, var(--primary-burgundy) 0%, #D4A373 100%)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: '2rem',
                    color: 'var(--white)',
                  }}
                >
                  {selectedProfile.profile_photo ? (
                    <img
                      src={selectedProfile.profile_photo}
                      alt={selectedProfile.user.first_name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        zIndex: 1,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '6rem',
                        fontFamily: 'var(--font-serif)',
                        color: 'rgba(255,255,255,0.15)',
                        fontWeight: 700,
                        position: 'absolute',
                        top: 0,
                        left: 0,
                      }}
                    >
                      {getInitials(
                        selectedProfile.user.first_name,
                        selectedProfile.user.last_name
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.75))',
                      zIndex: 2,
                    }}
                  />

                  <div
                    style={{
                      position: 'relative',
                      zIndex: 3,
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end',
                      textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div>
                      <span
                        className="badge-premium"
                        style={{
                          display: 'inline-block',
                          marginBottom: '0.5rem',
                          background: 'rgba(212, 163, 115, 0.35)',
                          color: 'var(--white)',
                          border: 'none',
                        }}
                      >
                        100% Completed
                      </span>
                      <h2
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '2.2rem',
                          fontWeight: 700,
                          margin: 0,
                        }}
                      >
                        {selectedProfile.user.first_name} {selectedProfile.user.last_name}
                      </h2>
                      <span
                        style={{
                          fontSize: '0.9rem',
                          opacity: 0.9,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          marginTop: '0.25rem',
                        }}
                      >
                        <MapPin size={14} />
                        {selectedProfile.city}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleLike(selectedProfile.user.id, e)}
                      className="btn btn-primary"
                      disabled={selectedProfile.liked_by_me}
                      style={{
                        borderRadius: '30px',
                        padding: '0.7rem 1.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: 'none',
                        background: selectedProfile.liked_by_me
                          ? 'rgba(255,255,255,0.2)'
                          : 'linear-gradient(135deg, #a31d56 0%, var(--primary-burgundy) 100%)',
                        color: 'var(--white)',
                        border: selectedProfile.liked_by_me
                          ? '1.5px solid rgba(255,255,255,0.3)'
                          : 'none',
                      }}
                    >
                      <Heart size={15} fill={selectedProfile.liked_by_me ? '#FFF' : 'none'} />
                      {selectedProfile.liked_by_me
                        ? 'Connection Requested'
                        : 'Send Connection Request'}
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div style={{ padding: '2.5rem 3rem' }}>
                  <div style={{ marginBottom: '2rem' }}>
                    <h4
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '1.25rem',
                        color: 'var(--primary-burgundy)',
                        marginBottom: '0.5rem',
                        borderBottom: '1px solid rgba(128,10,63,0.05)',
                        paddingBottom: '0.4rem',
                      }}
                    >
                      About Me
                    </h4>
                    <p
                      style={{
                        color: 'var(--text-medium)',
                        fontSize: '0.95rem',
                        lineHeight: 1.6,
                        fontStyle: 'italic',
                      }}
                    >
                      "{selectedProfile.about_me}"
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '2.5rem',
                      marginBottom: '2rem',
                    }}
                  >
                    {/* Personal Info */}
                    <div>
                      <h4
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '1.25rem',
                          color: 'var(--primary-burgundy)',
                          marginBottom: '0.8rem',
                          borderBottom: '1px solid rgba(128,10,63,0.05)',
                          paddingBottom: '0.4rem',
                        }}
                      >
                        Personal Information
                      </h4>
                      <table
                        style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}
                      >
                        <tbody>
                          {[
                            ['Age', `${selectedProfile.user.age} yrs`],
                            ['Gender', selectedProfile.user.gender],
                            ['Height', selectedProfile.height],
                            [
                              'Religion / Caste',
                              `${selectedProfile.religion} (${selectedProfile.caste})`,
                            ],
                            ['Marital Status', selectedProfile.marital_status],
                            ['Blood Group', selectedProfile.blood_group],
                            ['Hometown', selectedProfile.hometown],
                          ].map(([label, value]) => (
                            <tr
                              key={label}
                              style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}
                            >
                              <td
                                style={{ padding: '0.6rem 0', color: 'var(--text-medium)' }}
                              >
                                {label}
                              </td>
                              <td
                                style={{
                                  padding: '0.6rem 0',
                                  fontWeight: 600,
                                  textAlign: 'right',
                                }}
                              >
                                {value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Professional Info */}
                    <div>
                      <h4
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '1.25rem',
                          color: 'var(--primary-burgundy)',
                          marginBottom: '0.8rem',
                          borderBottom: '1px solid rgba(128,10,63,0.05)',
                          paddingBottom: '0.4rem',
                        }}
                      >
                        Professional Information
                      </h4>
                      <table
                        style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}
                      >
                        <tbody>
                          {[
                            ['Education', selectedProfile.education],
                            ['Occupation', selectedProfile.occupation],
                            ['Working Status', selectedProfile.working_status],
                            ['Annual Salary', selectedProfile.annual_salary],
                            ['Family Type', selectedProfile.family_type],
                          ].map(([label, value]) => (
                            <tr
                              key={label}
                              style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}
                            >
                              <td
                                style={{ padding: '0.6rem 0', color: 'var(--text-medium)' }}
                              >
                                {label}
                              </td>
                              <td
                                style={{
                                  padding: '0.6rem 0',
                                  fontWeight: 600,
                                  textAlign: 'right',
                                }}
                              >
                                {value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Privacy notice */}
                  <div
                    style={{
                      backgroundColor: 'rgba(212,163,115,0.08)',
                      border: '1px dashed var(--secondary-gold)',
                      borderRadius: '16px',
                      padding: '1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      color: '#8c6031',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      marginBottom: '1rem',
                    }}
                  >
                    <ShieldClose size={24} style={{ color: 'var(--primary-burgundy)' }} />
                    <div>
                      <span
                        style={{
                          color: 'var(--primary-burgundy)',
                          display: 'block',
                          fontWeight: 700,
                        }}
                      >
                        Mobile Number Masked for Privacy
                      </span>
                      For security, you cannot view this person's phone number. Connect with them
                      to initiate contact or request compatibility unlock!
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
