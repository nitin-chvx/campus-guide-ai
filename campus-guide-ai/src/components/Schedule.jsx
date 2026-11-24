import { useEffect, useMemo, useRef, useState } from "react";
import { SCHEDULE_STORAGE_KEY } from "../data/scheduleStorage";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EMPTY_FORM = {
  subject: "",
  day: "Monday",
  startTime: "",
  endTime: "",
  place: "",
  notes: "",
};

const sortByStart = (a, b) => a.startTime.localeCompare(b.startTime);
const getTodayName = (date) => date.toLocaleDateString("en-US", { weekday: "long" });
const formatTime = (time) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

function Schedule({ campusLocations, locationsLoading, locationsError, onViewOnMap }) {
  const [classes, setClasses] = useState([]);
  const [storageLoading, setStorageLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = getTodayName(new Date());
    return DAYS.includes(today) ? today : "Monday";
  });
  const [now, setNow] = useState(() => new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const submissionGuard = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) throw new Error("Invalid saved schedule.");
        setClasses(parsed.filter((item) =>
          item && typeof item.id === "string" && typeof item.subject === "string" &&
          DAYS.includes(item.day) && typeof item.startTime === "string" &&
          typeof item.endTime === "string"
        ));
      }
    } catch {
      setStorageError("Saved schedule could not be read from this browser.");
    } finally {
      setStorageLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const today = getTodayName(now);
  const todayClasses = useMemo(
    () => classes.filter((item) => item.day === today).sort(sortByStart),
    [classes, today]
  );
  const selectedClasses = useMemo(
    () => classes.filter((item) => item.day === selectedDay).sort(sortByStart),
    [classes, selectedDay]
  );
  const nextTodayClass = todayClasses.find((item) => {
    const [hours, minutes] = item.startTime.split(":").map(Number);
    const start = new Date(now);
    start.setHours(hours, minutes, 0, 0);
    return start >= now;
  });

  const persistClasses = (nextClasses) => {
    try {
      window.localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(nextClasses));
      setClasses(nextClasses);
      setStorageError("");
      return true;
    } catch {
      setStorageError("Your browser could not save this schedule. Check available local storage and try again.");
      return false;
    }
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, day: DAYS.includes(today) ? today : "Monday" });
    setFormError("");
    setIsFormOpen(true);
  };

  const openEditForm = (item) => {
    setEditingId(item.id);
    setForm({
      subject: item.subject,
      day: item.day,
      startTime: item.startTime,
      endTime: item.endTime,
      place: item.place || "",
      notes: item.notes || "",
    });
    setFormError("");
    setIsFormOpen(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (submissionGuard.current || isSaving) return;
    submissionGuard.current = true;
    setIsSaving(true);
    setFormError("");

    const subject = form.subject.trim();
    if (!subject || !DAYS.includes(form.day) || !form.startTime || !form.endTime) {
      setFormError("Add a subject, day, start time and end time to continue.");
      submissionGuard.current = false;
      setIsSaving(false);
      return;
    }
    if (form.endTime <= form.startTime) {
      setFormError("End time must be later than start time.");
      submissionGuard.current = false;
      setIsSaving(false);
      return;
    }

    const place = form.place.trim();
    const verifiedBuilding = campusLocations.find((building) =>
      building.is_verified === true && building.name.toLowerCase() === place.toLowerCase()
    );
    const nextItem = {
      id: editingId || (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      subject,
      day: form.day,
      startTime: form.startTime,
      endTime: form.endTime,
      place,
      buildingId: verifiedBuilding?.id || "",
      notes: form.notes.trim(),
    };
    const nextClasses = editingId
      ? classes.map((item) => item.id === editingId ? nextItem : item)
      : [...classes, nextItem];

    if (persistClasses(nextClasses)) {
      setSelectedDay(nextItem.day);
      setIsFormOpen(false);
    }
    window.setTimeout(() => {
      submissionGuard.current = false;
    }, 300);
    setIsSaving(false);
  };

  const deleteClass = (item) => {
    if (!window.confirm(`Delete “${item.subject}” from your schedule?`)) return;
    persistClasses(classes.filter((entry) => entry.id !== item.id));
  };

  const getStatus = (item) => {
    if (item.day !== today) return "scheduled";
    const [startHours, startMinutes] = item.startTime.split(":").map(Number);
    const [endHours, endMinutes] = item.endTime.split(":").map(Number);
    const start = new Date(now);
    const end = new Date(now);
    start.setHours(startHours, startMinutes, 0, 0);
    end.setHours(endHours, endMinutes, 0, 0);
    if (end <= now) return "completed";
    if (start <= now) return "in-progress";
    return "upcoming";
  };

  const pageDate = now.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <main className="schedule-page">
      <header className="schedule-page-header">
        <div>
          <span className="schedule-eyebrow"><span /> PERSONAL TIMETABLE</span>
          <h1>Your <em>Schedule</em></h1>
          <p>Keep track of your classes and campus activities.</p>
        </div>
        <div className="schedule-date-card" aria-live="polite">
          <span className="schedule-date-icon" aria-hidden="true">▦</span>
          <div><small>TODAY</small><strong>{pageDate}</strong></div>
        </div>
      </header>

      {storageError && <div className="schedule-alert" role="status">{storageError}</div>}

      <section className="schedule-overview" aria-labelledby="today-overview-title">
        <div className="schedule-overview-heading">
          <div><span className="schedule-section-kicker">YOUR DAY</span><h2 id="today-overview-title">Today overview</h2></div>
          <span className="schedule-count"><strong>{todayClasses.length}</strong> {todayClasses.length === 1 ? "class" : "classes"}</span>
        </div>
        {todayClasses.length === 0 ? (
          <div className="schedule-today-empty">
            <span className="schedule-empty-icon" aria-hidden="true">☀</span>
            <div><strong>{DAYS.includes(today) ? "A clear day ahead" : "Enjoy your Sunday"}</strong><p>{DAYS.includes(today) ? "No classes are on your schedule today. Add one whenever you’re ready." : "Your weekly timetable runs Monday through Saturday."}</p></div>
          </div>
        ) : (
          <div className="today-class-list">
            {todayClasses.map((item) => {
              const status = getStatus(item);
              const isNext = nextTodayClass?.id === item.id;
              return (
                <article className={`today-class-row ${isNext ? "is-next" : ""}`} key={item.id}>
                  <div className="today-class-time">{formatTime(item.startTime)}<span>{formatTime(item.endTime)}</span></div>
                  <div className="today-class-main"><strong>{item.subject}</strong><span>{item.place || "Location not specified"}</span></div>
                  <span className={`class-status status-${status}`}>{isNext ? "Next up" : status === "in-progress" ? "In progress" : status === "completed" ? "Completed" : "Upcoming"}</span>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="weekly-schedule" aria-labelledby="weekly-timetable-title">
        <div className="weekly-schedule-heading">
          <div><span className="schedule-section-kicker">PLAN YOUR WEEK</span><h2 id="weekly-timetable-title">Weekly timetable</h2><p>Choose a day to see your classes in time order.</p></div>
          <button type="button" className="schedule-add-button" onClick={openAddForm}><span aria-hidden="true">+</span> Add class</button>
        </div>

        <div className="schedule-day-tabs" role="tablist" aria-label="Days of the week">
          {DAYS.map((day) => {
            const count = classes.filter((item) => item.day === day).length;
            return <button type="button" role="tab" aria-selected={selectedDay === day} className={selectedDay === day ? "active" : ""} key={day} onClick={() => setSelectedDay(day)}><span>{day.slice(0, 3)}</span><small>{count}</small></button>;
          })}
        </div>

        <div className="schedule-day-heading"><h3>{selectedDay}</h3><span>{selectedClasses.length} {selectedClasses.length === 1 ? "class" : "classes"}</span></div>

        {storageLoading ? (
          <div className="schedule-loading" role="status"><span className="schedule-spinner" />Loading your saved schedule…</div>
        ) : selectedClasses.length === 0 ? (
          <div className="schedule-empty-state">
            <span className="schedule-empty-icon" aria-hidden="true">▤</span>
            <h3>No classes planned for {selectedDay}</h3>
            <p>Your timetable starts with you. Add a class to organize your week.</p>
            <button type="button" className="schedule-add-button schedule-add-secondary" onClick={openAddForm}><span aria-hidden="true">+</span> Add your first class</button>
          </div>
        ) : (
          <div className="schedule-class-list">
            {selectedClasses.map((item) => {
              const status = getStatus(item);
              const building = campusLocations.find((entry) => entry.id === item.buildingId && entry.is_verified === true);
              return (
                <article className={`schedule-class-card ${status === "completed" ? "is-completed" : ""}`} key={item.id}>
                  <div className="schedule-class-time"><strong>{formatTime(item.startTime)}</strong><span>{formatTime(item.endTime)}</span></div>
                  <div className="schedule-class-divider" />
                  <div className="schedule-class-details"><div className="schedule-class-title-row"><h3>{item.subject}</h3><span className={`class-status status-${status}`}>{status === "in-progress" ? "In progress" : status[0].toUpperCase() + status.slice(1)}</span></div>
                    {item.place && <p className="schedule-class-place"><span aria-hidden="true">⌖</span>{item.place}</p>}
                    {item.notes && <p className="schedule-class-notes">{item.notes}</p>}
                    {building && <button type="button" className="schedule-map-link" onClick={() => onViewOnMap(building)}>View on Map <span aria-hidden="true">↗</span></button>}
                  </div>
                  <div className="schedule-class-actions"><button type="button" onClick={() => openEditForm(item)} aria-label={`Edit ${item.subject}`}>Edit</button><button type="button" className="schedule-delete-button" onClick={() => deleteClass(item)} aria-label={`Delete ${item.subject}`}>Delete</button></div>
                </article>
              );
            })}
          </div>
        )}
        {!locationsLoading && locationsError && <p className="schedule-data-note">Campus building suggestions are unavailable right now. You can still enter a room or location.</p>}
      </section>

      {isFormOpen && (
        <div className="schedule-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsFormOpen(false); }}>
          <section className="schedule-form-modal" role="dialog" aria-modal="true" aria-labelledby="schedule-form-title">
            <div className="schedule-form-heading"><div><span className="schedule-section-kicker">PERSONAL TIMETABLE</span><h2 id="schedule-form-title">{editingId ? "Edit class" : "Add a class"}</h2><p>Enter the details you want to remember.</p></div><button type="button" className="schedule-modal-close" onClick={() => setIsFormOpen(false)} aria-label="Close form">×</button></div>
            <form onSubmit={handleSubmit}>
              <label>Subject name <input autoFocus required maxLength={100} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="e.g. Biology 101" /></label>
              <div className="schedule-form-grid">
                <label>Day<select required value={form.day} onChange={(event) => setForm({ ...form, day: event.target.value })}>{DAYS.map((day) => <option key={day}>{day}</option>)}</select></label>
                <label>Start time<input required type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></label>
                <label>End time<input required type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} /></label>
              </div>
              <label>Building or room <input list="verified-campus-buildings" maxLength={120} value={form.place} onChange={(event) => setForm({ ...form, place: event.target.value })} placeholder="Choose a building or enter a room" />
                <datalist id="verified-campus-buildings">{campusLocations.filter((building) => building.is_verified === true).map((building) => <option value={building.name} key={building.id} />)}</datalist>
                <small>{locationsLoading ? "Loading verified campus buildings…" : "Suggestions come from the verified campus directory. You can also enter a room."}</small>
              </label>
              <label>Notes <textarea rows={3} maxLength={500} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Optional reminders" /></label>
              {formError && <div className="schedule-form-error" role="alert">{formError}</div>}
              <div className="schedule-form-actions"><button type="button" className="schedule-cancel-button" onClick={() => setIsFormOpen(false)}>Cancel</button><button type="submit" className="schedule-add-button" disabled={isSaving}>{isSaving ? "Saving…" : editingId ? "Save changes" : "Add class"}</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default Schedule;
