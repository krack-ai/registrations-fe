import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../api/api";
import "./Users.css";



const formatDate = (value) => {
  if (!value) return "—";

  // Supports Firebase timestamps stored as milliseconds, numeric strings,
  // or date strings.
  const numericValue =
    typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))
      ? Number(value)
      : value;

  const date = new Date(numericValue);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// const normalize = (value) => String(value ?? "").trim().toLowerCase();

export default function SubmittedUsers() {
  const [profiles, setProfiles] = useState([]);
  const [submitters, setSubmitters] = useState([]);
  const [selectedSubmitter, setSelectedSubmitter] = useState("all");
  const [search, setSearch] = useState("");
  const [clickStatus, setClickStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedProfileKeys, setSelectedProfileKeys] = useState([]);
  const [whatsAppMessage, setWhatsAppMessage] = useState("");
//   const [wasenderApiKey, setWasenderApiKey] = useState("");
  const [sendingMessages, setSendingMessages] = useState(false);
  const [sendSummary, setSendSummary] = useState(null);
  const [page, setPage] = useState(1);
const [nextCursor, setNextCursor] = useState(null);
const [cursorHistory, setCursorHistory] = useState([null]);
const [hasNextPage, setHasNextPage] = useState(false);

const [dashboardStats, setDashboardStats] = useState(null);
const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
const [refreshAvailable, setRefreshAvailable] = useState(true);
const [remainingMs, setRemainingMs] = useState(0);
const [refreshingStats, setRefreshingStats] = useState(false);

const PAGE_SIZE = 50;

//   const loadSubmittedProfiles = useCallback(async ({ silent = false } = {}) => {
//     if (silent) {
//       setRefreshing(true);
//     } else {
//       setLoading(true);
//     }

//     setLoadError("");

//     try {
//       // api is the same Axios instance used by Dashboard.jsx.
//       // It should already configure the base URL and auth token.
//       const [usersResponse, profilesResponse] = await Promise.all([
//         api.get("profile/admin/users"),
//         api.get("profile/admin/all"),
//       ]);

//       const userData = usersResponse.data;
//       const profileData = profilesResponse.data;

//       const userList = Array.isArray(userData)
//         ? userData
//         : userData?.users ?? [];

//       const profileList = Array.isArray(profileData)
//         ? profileData
//         : profileData?.profiles ?? profileData?.data ?? [];

//       setSubmitters(
//         [...new Set(
//           userList
//             .map((item) =>
//               typeof item === "string"
//                 ? item
//                 : item?.submittedUser ?? item?.email ?? ""
//             )
//             .map((value) => String(value).trim())
//             .filter(Boolean)
//         )].sort((a, b) => a.localeCompare(b))
//       );

//       setProfiles(
//         profileList.map((profile) => {
//           const tracking = profile.emailTracking ?? {};

//           return {
//             ...profile,
//             id: profile.id ?? profile.key ?? profile.profileId,
//             fullName: profile.fullName ?? profile.name ?? "",
//             email: profile.email ?? "",
//             phone: profile.phone ?? "",
//             techStack: profile.techStack ?? "",
//             submittedUser: profile.submittedUser ?? "",
//             createdAt: profile.createdAt ?? profile.submittedAt ?? null,
//             clicked: profile.clicked === true || tracking.clicked === true,
//             clickedAt: profile.clickedAt ?? tracking.clickedAt ?? null,
//             visited: profile.visited === true || tracking.visited === true,
//             visitedAt: profile.visitedAt ?? tracking.visitedAt ?? null,
//           };
//         })
//       );
//     } catch (error) {
//       console.error("Unable to load submitted profiles:", error);
//       const message =
//         error.response?.data?.message ||
//         "Unable to load submitted profiles. Please try again.";

//       setLoadError(message);
//       toast.error(message);
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, []);


const loadSubmittedProfiles = useCallback(
  async ({
    silent = false,
    cursor = null,
    pageOverride = 1,
  } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setLoadError("");

    try {
      const params = { limit: PAGE_SIZE };

      if (cursor) {
        params.cursorCreatedAt = cursor.createdAt;
        params.cursorId = cursor.id;
      }

      const [usersResponse, profilesResponse] = await Promise.all([
        api.get("profile/admin/users"),
        api.get("profile/admin/all", { params }),
      ]);

      const userData = usersResponse.data;
      const profileData = profilesResponse.data;

      const userList = Array.isArray(userData)
        ? userData
        : userData?.users ?? [];

      setSubmitters(
        [...new Set(
          userList
            .map((item) =>
              typeof item === "string"
                ? item
                : item?.submittedUser ?? item?.email ?? ""
            )
            .map((value) => String(value).trim())
            .filter(Boolean)
        )].sort((a, b) => a.localeCompare(b))
      );

      const profileList = profileData?.profiles ?? [];

      setProfiles(
        profileList.map((profile) => {
          const tracking = profile.emailTracking ?? {};

          return {
            ...profile,
            id: profile.id ?? profile.key ?? profile.profileId,
            fullName: profile.fullName ?? profile.name ?? "",
            email: profile.email ?? "",
            phone: profile.phone ?? "",
            techStack: profile.techStack ?? "",
            submittedUser: profile.submittedUser ?? "",
            createdAt: profile.createdAt ?? profile.submittedAt ?? null,
            clicked: profile.clicked === true || tracking.clicked === true,
            clickedAt: profile.clickedAt ?? tracking.clickedAt ?? null,
            visited: profile.visited === true || tracking.visited === true,
            visitedAt: profile.visitedAt ?? tracking.visitedAt ?? null,
          };
        })
      );

      setPage(pageOverride);
      setNextCursor(profileData?.nextCursor ?? null);
      setHasNextPage(profileData?.hasNextPage === true);
    } catch (error) {
      console.error("Unable to load submitted profiles:", error);

      const message =
        error.response?.data?.message ||
        "Unable to load submitted profiles. Please try again.";

      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  },
  []
);


const loadDashboardStats = useCallback(async () => {
  console.log("📊 Loading dashboard stats...");

  try {
    const response = await api.get("profile/admin/stats");

    console.log("✅ Stats API response:", response.data);

    const data = response.data;

    setDashboardStats(data.stats ?? null);
    setLastRefreshedAt(data.lastRefreshedAt ?? null);
    setRefreshAvailable(data.refreshAvailable ?? true);
    setRemainingMs(data.remainingMs ?? 0);
  } catch (error) {
    console.error("❌ Stats API error:", {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
  }
}, []);


const refreshDashboardStats = async () => {
  if (refreshingStats || !refreshAvailable) return;

  setRefreshingStats(true);

  try {
    const response = await api.post("profile/admin/stats/refresh");
    const data = response.data;

    setDashboardStats(data.stats ?? null);
    setLastRefreshedAt(data.lastRefreshedAt ?? null);
    setRefreshAvailable(data.refreshAvailable ?? false);
    setRemainingMs(data.remainingMs ?? 90 * 60 * 1000);

    toast.success("Dashboard statistics refreshed successfully.");
  } catch (error) {
    const data = error.response?.data;

    if (error.response?.status === 429) {
      setRefreshAvailable(false);
      setRemainingMs(data?.remainingMs ?? 0);
      setLastRefreshedAt(data?.lastRefreshedAt ?? null);

      toast.info("Stats refresh is limited to once every 90 minutes.");
    } else {
      toast.error(
        data?.message || "Unable to refresh dashboard statistics."
      );
    }

    // Reload the saved values in case another request refreshed them.
    await loadDashboardStats();
  } finally {
    setRefreshingStats(false);
  }
};

const formatRemainingTime = (milliseconds) => {
  const totalMinutes = Math.ceil(Math.max(0, milliseconds) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};


useEffect(() => {
  console.log("🚀 SubmittedUsers mounted");

  loadSubmittedProfiles();
  loadDashboardStats();
}, [loadSubmittedProfiles, loadDashboardStats]);


//   const filteredProfiles = useMemo(() => {
//     const query = normalize(search);

//     return profiles.filter((profile) => {
//       const matchesSubmitter =
//         selectedSubmitter === "all" ||
//         normalize(profile.submittedUser) === normalize(selectedSubmitter);

//       const searchableFields = [
//         profile.fullName,
//         profile.email,
//         profile.phone,
//         profile.techStack,
//         profile.submittedUser,
//       ];

//       const matchesSearch = searchableFields.some((field) =>
//         normalize(field).includes(query)
//       );

//       const matchesClickStatus =
//         clickStatus === "all" ||
//         (clickStatus === "clicked" && profile.clicked) ||
//         (clickStatus === "not-clicked" && !profile.clicked);

//       const submissionDate = getDateKey(profile.createdAt);
//       const matchesFromDate =
//         !fromDate || (submissionDate && submissionDate >= fromDate);
//       const matchesToDate =
//         !toDate || (submissionDate && submissionDate <= toDate);

//       return (
//         matchesSubmitter &&
//         matchesSearch &&
//         matchesClickStatus &&
//         matchesFromDate &&
//         matchesToDate
//       );
//     });
//   }, [
//     profiles,
//     selectedSubmitter,
//     search,
//     clickStatus,
//     fromDate,
//     toDate,
//   ]);

const filteredProfiles = profiles
  const getProfileKey = (profile) => String(profile.id ?? profile.email ?? profile.phone ?? profile.fullName ?? "unknown-profile");

  const selectedProfiles = profiles.filter((profile, index) =>
    selectedProfileKeys.includes(getProfileKey(profile, index))
  );
  const filteredKeys = filteredProfiles.map((profile, index) => getProfileKey(profile, index));
  const allFilteredSelected = filteredKeys.length > 0 && filteredKeys.every((key) => selectedProfileKeys.includes(key));
  const selectedWithPhone = selectedProfiles.filter((profile) => String(profile.phone ?? "").trim());

  const toggleProfile = (profile, index) => {
    const key = getProfileKey(profile, index);
    setSelectedProfileKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedProfileKeys((current) => current.filter((key) => !filteredKeys.includes(key)));
    } else {
      setSelectedProfileKeys((current) => [...new Set([...current, ...filteredKeys])]);
    }
  };

  const normalizeWhatsAppPhone = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    // Assume Indian country code only for 10-digit numbers. Prefer storing
    // all other numbers in international format, e.g. +14155552671.
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
    if (raw.startsWith("+")) return `+${digits}`;
    if (digits.startsWith("00")) return `+${digits.slice(2)}`;
    if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
    return "";
  };

  const formatIndianPhone = (phone) => {
  const digits = String(phone ?? "").replace(/\D/g, "");
  const last10Digits = digits.slice(-10);

  if (last10Digits.length !== 10) {
    throw new Error(`Invalid phone number: ${phone}`);
  }

  return `+91${last10Digits}`;
};

  const sendWhatsAppMessages = async () => {
    const text = whatsAppMessage.trim();
    // const token = wasenderApiKey.trim();
    // if (!token) {
    //   toast.error("Enter your WasenderAPI token first.");
    //   return;
    // }
    if (!selectedProfiles.length) {
      toast.error("Select at least one user first.");
      return;
    }
    if (!text) {
      toast.error("Enter a WhatsApp message first.");
      return;
    }

    const recipients = selectedProfiles
      .map((profile) => ({
        name: profile.fullName,
        phone: normalizeWhatsAppPhone(profile.phone),
      }));
    const validRecipients = recipients.filter((recipient) => recipient.phone);
    const invalidCount = recipients.length - validRecipients.length;
    if (!validRecipients.length) {
      toast.error("The selected users do not have valid mobile numbers.");
      return;
    }

    const confirmed = window.confirm(
      `Send this WhatsApp message to ${validRecipients.length} recipient(s)?${invalidCount ? ` ${invalidCount} invalid/missing number(s) will be skipped.` : ""} Only message people who have agreed to receive WhatsApp messages.`
    );
    if (!confirmed) return;

    setSendingMessages(true);
    setSendSummary(null);
    try {
      const results = [];
      // Send sequentially to reduce burst traffic and retain per-number results.
      for (const recipient of validRecipients) {
        try {
          const response = await fetch("https://www.wasenderapi.com/api/send-message", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.REACT_APP_WA_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ to: formatIndianPhone(recipient.phone), text }),
          });
          const payload = await response.json().catch(() => ({}));
          const succeeded = response.ok && payload.success !== false && !payload.error;
          results.push({
            name: recipient.name,
            phone: recipient.phone,
            success: succeeded,
            error: succeeded ? "" : (payload.message || payload.error || `WasenderAPI returned HTTP ${response.status}.`),
            status: payload.data?.status ?? payload.status ?? (succeeded ? "submitted" : "failed"),
          });
        } catch (error) {
          results.push({
            name: recipient.name,
            phone: recipient.phone,
            success: false,
            error: error instanceof TypeError
              ? "Network/CORS error. The API may not allow browser requests; if so, a backend proxy is required."
              : (error.message || "Request failed."),
          });
        }
      }

      const sent = results.filter((item) => item.success).length;
      const failed = results.length - sent + invalidCount;
      const details = [
        ...results,
        ...recipients.filter((recipient) => !recipient.phone).map((recipient) => ({
          name: recipient.name,
          phone: recipient.phone || "Missing/invalid number",
          success: false,
          error: "Missing or invalid mobile number; skipped.",
        })),
      ];
      setSendSummary({ sent, failed, details });
      if (failed === 0) {
        toast.success(`WhatsApp API accepted ${sent} message(s).`);
        setSelectedProfileKeys([]);
      } else {
        toast.warning?.(`${sent} accepted, ${failed} failed or skipped. Check the results below.`);
      }
    } finally {
      setSendingMessages(false);
    }
  };

//   const clickedCount = filteredProfiles.filter((profile) => profile.clicked).length;
//   const notClickedCount = filteredProfiles.length - clickedCount;
//   const clickRate = filteredProfiles.length
//     ? Math.round((clickedCount / filteredProfiles.length) * 100)
//     : 0;

const totalUsers = dashboardStats?.totalUsers ?? 0;
const clickedCount = dashboardStats?.clickedUsers ?? 0;
const notClickedCount = dashboardStats?.notClickedUsers ?? 0;
const clickRate = dashboardStats?.clickRate ?? 0;

  const resetFilters = () => {
    setSelectedSubmitter("all");
    setSearch("");
    setClickStatus("all");
    setFromDate("");
    setToDate("");
  };

  return (
    <div className="submitted-users-page">
      <header className="su-page-heading">
        <div>
          <span className="su-eyebrow">KRACK-AI / PROFILE ANALYTICS</span>
          <h1>Submitted Users</h1>
          <p>Review submitted profiles and monitor email click activity.</p>
        </div>

       <div className="su-header-actions">
  <button
    type="button"
    className="su-button su-button-light"
    onClick={() =>
      loadSubmittedProfiles({
        silent: true,
        cursor: cursorHistory[page - 1] ?? null,
        pageOverride: page,
      })
    }
    disabled={loading || refreshing}
  >
    {refreshing ? "Refreshing table..." : "↻ Refresh Table"}
  </button>

  <button
    type="button"
    className="su-button su-button-primary"
    onClick={refreshDashboardStats}
    disabled={refreshingStats || !refreshAvailable}
    title={
      !refreshAvailable
        ? `Available in ${formatRemainingTime(remainingMs)}`
        : "Refresh dashboard statistics"
    }
  >
    {refreshingStats
      ? "Refreshing stats..."
      : refreshAvailable
        ? "↻ Refresh Stats"
        : `Available in ${formatRemainingTime(remainingMs)}`}
  </button>
</div>
      </header>

   <section className="su-stats-grid" aria-label="Profile statistics">
  <article className="su-stat-card">
    <span className="su-stat-label">Total users</span>
    <strong>{dashboardStats ? totalUsers.toLocaleString("en-IN") : "—"}</strong>
    <small>All submitted profiles</small>
  </article>

  <article className="su-stat-card">
    <span className="su-stat-label">Clicked users</span>
    <strong className="su-green-text">
      {dashboardStats ? clickedCount.toLocaleString("en-IN") : "—"}
    </strong>
    <small>Unique profiles clicked</small>
  </article>

  <article className="su-stat-card">
    <span className="su-stat-label">Not clicked</span>
    <strong className="su-orange-text">
      {dashboardStats ? notClickedCount.toLocaleString("en-IN") : "—"}
    </strong>
    <small>No click recorded</small>
  </article>

  <article className="su-stat-card">
    <span className="su-stat-label">Click rate</span>
    <strong className="su-purple-text">
      {dashboardStats ? `${clickRate}%` : "—"}
    </strong>
    <small>Clicked users / total users</small>
  </article>

  <p className="su-stats-refresh-info">
    {lastRefreshedAt
      ? `Statistics last refreshed: ${formatDate(lastRefreshedAt)}`
      : "Statistics have not been refreshed yet."}
  </p>
</section>

      <section className="su-panel">
        <div className="su-panel-heading">
          <div>
            <h2>Profile directory</h2>
            <p>Filter by submitter, submission date, and click status.</p>
          </div>
          <span className="su-record-count">
            {filteredProfiles.length} records
          </span>
        </div>

        <div className="su-filters">
          <label className="su-field">
            <span>Submitted by</span>
            <select
              value={selectedSubmitter}
              onChange={(event) => setSelectedSubmitter(event.target.value)}
            >
              <option value="all">All submitters</option>
              {submitters.map((submitter) => (
                <option key={submitter} value={submitter}>
                  {submitter}
                </option>
              ))}
            </select>
          </label>

          <label className="su-field su-search-field">
            <span>Search</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email, phone, technology..."
            />
          </label>

          <label className="su-field">
            <span>Click status</span>
            <select
              value={clickStatus}
              onChange={(event) => setClickStatus(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="clicked">Clicked</option>
              <option value="not-clicked">Not clicked</option>
            </select>
          </label>

          <label className="su-field">
            <span>From date</span>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </label>

          <label className="su-field">
            <span>To date</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => setToDate(event.target.value)}
            />
          </label>

          <div className="su-filter-actions">
            <button type="button" className="su-button su-button-light" onClick={resetFilters}>
              Clear filters
            </button>
          </div>
        </div>

        {loadError && (
          <div className="su-error" role="alert">
            <span>{loadError}</span>
            <button type="button" onClick={() => loadSubmittedProfiles()}>
              Try again
            </button>
          </div>
        )}

        <section className="su-whatsapp-composer" aria-label="Send WhatsApp message">
          <div className="su-whatsapp-composer-heading">
            <div>
              <h3>WhatsApp message</h3>
              <p>Select users from the table, write your message, and send it to their mobile numbers.</p>
            </div>
            <span className="su-selected-count">{selectedProfileKeys.length} selected</span>
          </div>
          {/* <label className="su-message-field">
            <span>WasenderAPI Bearer token</span>
            <input
              type="password"
              value={wasenderApiKey}
              onChange={(event) => setWasenderApiKey(event.target.value)}
              placeholder="Paste your WasenderAPI token for this session"
              autoComplete="off"
              spellCheck="false"
            />
            <small className="su-token-warning">Frontend-only mode: this token can be inspected by browser tools and network requests. Do not use a sensitive production token here.</small>
          </label> */}
          <label className="su-message-field">
            <span>Message</span>
            <textarea
              value={whatsAppMessage}
              onChange={(event) => setWhatsAppMessage(event.target.value)}
              placeholder="Write your WhatsApp message here..."
              rows={4}
              maxLength={4000}
            />
            <small>{whatsAppMessage.length}/4000 characters</small>
          </label>
          <div className="su-whatsapp-actions">
            {/* <span className="su-message-help">
              {selectedProfiles.length - selectedWithPhone.length > 0
                ? `${selectedProfiles.length - selectedWithPhone.length} selected user(s) have no phone number and will be skipped.`
                : "Only send messages to people who have opted in to receive them."}
            </span> */}
            <button
              type="button"
              className="su-button su-button-whatsapp"
              onClick={sendWhatsAppMessages}
              disabled={sendingMessages || !selectedWithPhone.length || !whatsAppMessage.trim()}
            >
              {sendingMessages ? "Sending..." : `Send WhatsApp (${selectedWithPhone.length})`}
            </button>
          </div>
          {sendSummary && (
            <div className={`su-send-summary ${sendSummary.failed ? "has-failures" : ""}`} role="status">
              <strong>Send results: {sendSummary.sent} accepted by API, {sendSummary.failed} failed or skipped.</strong>
              {sendSummary.details.length > 0 && (
                <ul>
                  {sendSummary.details.map((item, index) => (
                    <li key={`${item.phone ?? item.to ?? index}-${index}`}>
                      {item.name || item.phone || item.to || "Recipient"}: {item.success ? "Submitted" : `Failed${item.error ? ` — ${item.error}` : ""}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <div className="su-table-scroll">
          <table className="su-table">
            <thead>
              <tr>
                <th className="su-checkbox-column">
                  <input
                    type="checkbox"
                    aria-label="Select all filtered users"
                    checked={allFilteredSelected}
                    onChange={toggleAllFiltered}
                    disabled={!filteredProfiles.length}
                  />
                </th>
                <th>Candidate</th>
                <th>Phone</th>
                <th>Tech stack</th>
                <th>Submitted by</th>
                <th>Submitted date</th>
                <th>Click status</th>
                <th>Clicked date</th>
                <th>Website visit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="su-empty-state">
                    Loading submitted profiles...
                  </td>
                </tr>
              ) : filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan="9" className="su-empty-state">
                    No profiles found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((profile, index) => {
                  const profileKey = getProfileKey(profile, index);
                  return (
                  <tr key={profileKey} className={selectedProfileKeys.includes(profileKey) ? "su-row-selected" : ""}>
                    <td className="su-checkbox-column">
                      <input
                        type="checkbox"
                        aria-label={`Select ${profile.fullName || profile.phone || profile.email || "user"}`}
                        checked={selectedProfileKeys.includes(profileKey)}
                        onChange={() => toggleProfile(profile, index)}
                      />
                    </td>
                    <td>
                      <strong>{profile.fullName || "—"}</strong>
                      <small>{profile.email || "—"}</small>
                    </td>
                    <td>{profile.phone || "—"}</td>
                    <td className="su-tech-cell">{profile.techStack || "—"}</td>
                    <td>{profile.submittedUser || "—"}</td>
                    <td>{formatDate(profile.createdAt)}</td>
                    <td>
                      <span className={`su-status ${profile.clicked ? "su-status-success" : "su-status-pending"}`}>
                        {profile.clicked ? "Clicked" : "Not clicked"}
                      </span>
                    </td>
                    <td>{formatDate(profile.clickedAt)}</td>
                    <td>
                      <span className={`su-status ${profile.visited ? "su-status-success" : "su-status-neutral"}`}>
                        {profile.visited ? "Visited" : "Not visited"}
                      </span>
                      {profile.visitedAt && (
                        <small className="su-secondary-date">
                          {formatDate(profile.visitedAt)}
                        </small>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="su-pagination">
  <button
    type="button"
    className="su-button su-button-light"
    disabled={loading || page <= 1}
    onClick={() => {
      const previousPage = page - 1;
      const previousCursor = cursorHistory[previousPage - 1] ?? null;

      loadSubmittedProfiles({
        cursor: previousCursor,
        pageOverride: previousPage,
      });
    }}
  >
    Previous
  </button>

  <span>Page {page}</span>

  <button
    type="button"
    className="su-button su-button-light"
    disabled={loading || !hasNextPage || !nextCursor}
    onClick={() => {
      const newHistory = [...cursorHistory];
      newHistory[page] = nextCursor;

      setCursorHistory(newHistory);

      loadSubmittedProfiles({
        cursor: nextCursor,
        pageOverride: page + 1,
      });
    }}
  >
    Next
  </button>
</div>
      </section>
    </div>
  );
}
