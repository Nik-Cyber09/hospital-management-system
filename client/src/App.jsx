import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'carepoint-hospital-demo-v2'
const makeEmptyData = () => ({ patients: [], doctors: [], appointments: [], invoices: [] })

const loadData = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { data: makeEmptyData(), error: '' }
    const parsed = JSON.parse(stored)
    const valid = ['patients', 'doctors', 'appointments', 'invoices'].every((key) => Array.isArray(parsed[key]))
    if (!valid) throw new Error('Saved demo data did not match the expected format.')
    return { data: parsed, error: '' }
  } catch (error) {
    return {
      data: makeEmptyData(),
      error: `Saved data could not be loaded (${error instanceof Error ? error.message : 'unknown error'}). Demo data is shown instead.`,
    }
  }
}

const Icon = ({ name, size = 19 }) => {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    patients: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 8v6m3-3h-6" /></>,
    doctors: <><path d="M12 8v4l2 2" /><circle cx="12" cy="12" r="9" /><path d="M8 3.9 6.5 2.5M16 3.9l1.5-1.4" /></>,
    billing: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h3" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-7-7 7 7-7 7" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m18 6-12 12M6 6l12 12" />,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.dashboard}</svg>
}

const initials = (name = '') => name.split(' ').filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase()
const formatDate = (value, options = { month: 'short', day: 'numeric', year: 'numeric' }) => {
  if (!value) return '—'
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-US', options).format(date)
}
const formatTime = (value) => value ? formatDate(value, { hour: 'numeric', minute: '2-digit' }) : '—'
const personName = (items, id) => items.find((item) => item.id === id)?.name || 'Unassigned'
const nextId = (items, prefix, digits = 3) => {
  const max = items.reduce((value, item) => {
    const number = Number(item.id?.split('-').at(-1))
    return Number.isFinite(number) ? Math.max(value, number) : value
  }, 0)
  return `${prefix}-${String(max + 1).padStart(digits, '0')}`
}

function StatusBadge({ children }) {
  return <span className={`status-badge status-${String(children).toLowerCase().replaceAll(' ', '-')}`}>{children}</span>
}

function Avatar({ name, tone = 0 }) {
  return <span className={`avatar avatar-${tone % 5}`} aria-hidden="true">{initials(name)}</span>
}

function App() {
  const [initial] = useState(loadData)
  const [records, setRecords] = useState(initial.data)
  const [activeSection, setActiveSection] = useState('Overview')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState(initial.error ? { kind: 'error', message: initial.error } : null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [today] = useState(() => {
    const date = new Date()
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
    } catch (error) {
      const message = `Changes could not be saved in this browser: ${error instanceof Error ? error.message : 'storage unavailable'}`
      window.setTimeout(() => setToast({ kind: 'error', message }), 0)
    }
  }, [records])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(null), toast.kind === 'error' ? 6000 : 3200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const todayAppointments = useMemo(() => records.appointments
    .filter((appointment) => appointment.date?.slice(0, 10) === today && appointment.status !== 'Cancelled')
    .sort((a, b) => a.date.localeCompare(b.date)), [records.appointments, today])
  const query = search.trim().toLowerCase()

  const visiblePatients = useMemo(() => records.patients.filter((patient) =>
    [patient.name, patient.id, patient.condition, patient.phone, personName(records.doctors, patient.doctorId)].some((value) => value.toLowerCase().includes(query))),
  [records.patients, records.doctors, query])
  const visibleDoctors = useMemo(() => records.doctors.filter((doctor) =>
    [doctor.name, doctor.id, doctor.specialty, doctor.email].some((value) => value.toLowerCase().includes(query))),
  [records.doctors, query])
  const visibleAppointments = useMemo(() => records.appointments.filter((appointment) =>
    [appointment.id, appointment.reason, appointment.status, personName(records.patients, appointment.patientId), personName(records.doctors, appointment.doctorId)]
      .some((value) => value.toLowerCase().includes(query)))
    .sort((a, b) => a.date.localeCompare(b.date)), [records.appointments, records.patients, records.doctors, query])
  const visibleInvoices = useMemo(() => records.invoices.filter((invoice) =>
    [invoice.id, invoice.description, invoice.status, personName(records.patients, invoice.patientId)].some((value) => value.toLowerCase().includes(query))),
  [records.invoices, records.patients, query])

  const notify = (message, kind = 'success') => setToast({ message, kind })
  const saveRecord = (kind, form) => {
    const current = modal?.item
    const collection = { patient: 'patients', doctor: 'doctors', appointment: 'appointments', invoice: 'invoices' }[kind]
    const prefix = { patient: 'PT', doctor: 'DR', appointment: 'AP', invoice: 'INV' }[kind]
    const id = current?.id || nextId(records[collection], prefix, kind === 'patient' ? 4 : 3)
    let item
    if (kind === 'patient') {
      item = { id, name: form.get('name').trim(), age: Number(form.get('age')), gender: form.get('gender'), phone: form.get('phone').trim(), condition: form.get('condition').trim(), doctorId: form.get('doctorId') || '', status: form.get('status') }
      setRecords((previous) => ({ ...previous, patients: current ? previous.patients.map((record) => record.id === id ? item : record) : [item, ...previous.patients] }))
    } else if (kind === 'doctor') {
      item = { id, name: form.get('name').trim(), specialty: form.get('specialty').trim(), email: form.get('email').trim(), phone: form.get('phone').trim(), status: form.get('status'), availability: form.get('availability').trim() }
      setRecords((previous) => ({ ...previous, doctors: current ? previous.doctors.map((record) => record.id === id ? item : record) : [item, ...previous.doctors] }))
    } else if (kind === 'appointment') {
      const selectedPatient = form.get('patientId')
      const selectedDoctor = form.get('doctorId')
      item = { id, patientId: selectedPatient, doctorId: selectedDoctor, date: form.get('date'), reason: form.get('reason').trim(), status: form.get('status') }
      setRecords((previous) => ({ ...previous, appointments: current ? previous.appointments.map((record) => record.id === id ? item : record) : [item, ...previous.appointments] }))
    } else {
      item = { id, patientId: form.get('patientId'), date: form.get('date'), description: form.get('description').trim(), amount: Number(form.get('amount')), status: form.get('status') }
      setRecords((previous) => ({ ...previous, invoices: current ? previous.invoices.map((record) => record.id === id ? item : record) : [item, ...previous.invoices] }))
    }
    setModal(null)
    notify(`${kind[0].toUpperCase()}${kind.slice(1)} ${current ? 'updated' : 'added'} successfully.`)
  }

  const setAppointmentStatus = (id, status) => {
    setRecords((previous) => ({ ...previous, appointments: previous.appointments.map((item) => item.id === id ? { ...item, status } : item) }))
    notify(`Appointment marked ${status.toLowerCase()}.`)
  }
  const toggleInvoice = (id) => {
    setRecords((previous) => ({ ...previous, invoices: previous.invoices.map((item) => item.id === id ? { ...item, status: item.status === 'Paid' ? 'Pending' : 'Paid' } : item) }))
    notify('Invoice payment status updated.')
  }
  const openAppointmentForm = () => {
    if (!records.patients.length || !records.doctors.length) {
      notify('Add at least one patient and one doctor before scheduling an appointment.', 'error')
      return
    }
    setModal({ kind: 'appointment' })
  }
  const openInvoiceForm = () => {
    if (!records.patients.length) {
      notify('Add at least one patient before creating an invoice.', 'error')
      return
    }
    setModal({ kind: 'invoice' })
  }
  const exportCsv = (type) => {
    const columns = {
      patients: ['id', 'name', 'age', 'gender', 'phone', 'condition', 'status'],
      doctors: ['id', 'name', 'specialty', 'email', 'phone', 'status'],
      appointments: ['id', 'date', 'patientId', 'doctorId', 'reason', 'status'],
      invoices: ['id', 'date', 'patientId', 'description', 'amount', 'status'],
    }[type]
    const csv = [columns.join(','), ...records[type].map((item) => columns.map((key) => `"${String(item[key] ?? '').replaceAll('"', '""')}"`).join(','))].join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `carepoint-${type}.csv`
    link.click()
    URL.revokeObjectURL(url)
    notify(`${type[0].toUpperCase()}${type.slice(1)} exported as CSV.`)
  }

  const navigation = [
    { label: 'Overview', icon: 'dashboard' },
    { label: 'Appointments', icon: 'calendar', count: todayAppointments.length },
    { label: 'Patients', icon: 'patients' },
    { label: 'Doctors', icon: 'doctors' },
    { label: 'Billing', icon: 'billing' },
  ]
  const sectionType = { Patients: 'patients', Doctors: 'doctors', Appointments: 'appointments', Billing: 'invoices' }[activeSection]

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#overview" onClick={() => setActiveSection('Overview')}>
          <span className="brand-mark"><Icon name="heart" size={21} /></span>
          <span><strong>carepoint</strong><small>HOSPITAL SYSTEM</small></span>
        </a>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <button key={item.label} className={`nav-link ${activeSection === item.label ? 'nav-link-active' : ''}`}
              onClick={() => { setActiveSection(item.label); setMobileNavOpen(false); setSearch('') }}>
              <Icon name={item.icon} /><span>{item.label}</span>
              {item.count > 0 && <span className="nav-count">{item.count}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-icon"><Icon name="heart" size={17} /></span>
          <strong>Care starts here</strong>
          <p>Your team's daily operations, all in one place.</p>
          <span className="demo-label"><span /> LOCAL DEMO MODE</span>
        </div>
        <button className="profile-card" onClick={() => notify('This local demo has no user accounts or sign-in.')}>
          <Avatar name="Clinic team" tone={2} /><span><strong>Clinic team</strong><small>Local workspace</small></span><Icon name="more" size={18} />
        </button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(!mobileNavOpen)}><Icon name="menu" /></button>
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{activeSection}</strong></div>
          <div className="topbar-actions">
            <label className="search-box">
              <Icon name="search" size={18} />
              <input aria-label={`Search ${activeSection.toLowerCase()}`} placeholder={`Search ${activeSection.toLowerCase()}...`} value={search} onChange={(event) => setSearch(event.target.value)} />
              <kbd>⌘ K</kbd>
            </label>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => notify('You’re all caught up.')}><Icon name="bell" /><i /></button>
            <span className="topbar-divider" />
            <span className="today-date">{formatDate(today, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>            <div className="eyebrow">{activeSection === 'Overview' ? `${formatDate(today, { weekday: 'long' }).toUpperCase()} · YOUR DAILY BRIEFING` : 'CAREPOINT HEALTH CENTER'}</div><h1>{activeSection === 'Overview' ? 'Welcome to Carepoint' : activeSection}</h1>
              <p>{activeSection === 'Overview' ? 'Here’s what’s happening at your clinic today.' : sectionDescription(activeSection)}</p></div>
            <div className="heading-actions">
              {sectionType && <button className="button button-secondary" onClick={() => exportCsv(sectionType)}><Icon name="download" size={17} /> Export</button>}
              {activeSection === 'Billing'
                ? <button className="button button-primary" onClick={openInvoiceForm}><Icon name="plus" size={18} /> New invoice</button>
                : <button className="button button-primary" onClick={activeSection === 'Doctors' ? () => setModal({ kind: 'doctor' }) : activeSection === 'Patients' ? () => setModal({ kind: 'patient' }) : openAppointmentForm}><Icon name="plus" size={18} /> {activeSection === 'Overview' ? 'New appointment' : `Add ${activeSection === 'Appointments' ? 'appointment' : activeSection.slice(0, -1).toLowerCase()}`}</button>}
            </div>
          </div>
          {activeSection === 'Overview' && <Dashboard records={records} today={today} todayAppointments={todayAppointments} onNavigate={setActiveSection} onNewAppointment={openAppointmentForm} />}
          {activeSection === 'Appointments' && <Appointments appointments={visibleAppointments} records={records} onEdit={(item) => setModal({ kind: 'appointment', item })} onStatus={setAppointmentStatus} />}
          {activeSection === 'Patients' && <Patients patients={visiblePatients} records={records} onEdit={(item) => setModal({ kind: 'patient', item })} />}
          {activeSection === 'Doctors' && <Doctors doctors={visibleDoctors} onEdit={(item) => setModal({ kind: 'doctor', item })} />}
          {activeSection === 'Billing' && <Billing invoices={visibleInvoices} records={records} onToggle={toggleInvoice} />}
          <footer className="page-footer"><span><span className="footer-dot" /> All changes are saved in this browser</span><span>Carepoint Health · Local demo · Not for real patient data</span></footer>
        </div>
      </main>

      {mobileNavOpen && <button className="mobile-overlay" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      {modal && <RecordModal key={`${modal.kind}-${modal.item?.id || 'new'}`} modal={modal} records={records} onClose={() => setModal(null)} onSave={saveRecord} />}
      {toast && <div className={`toast toast-${toast.kind}`} role="status"><span>{toast.kind === 'error' ? '!' : '✓'}</span>{toast.message}<button aria-label="Dismiss notification" onClick={() => setToast(null)}><Icon name="close" size={16} /></button></div>}
    </div>
  )
}

function sectionDescription(section) {
  return {
    Appointments: 'Manage your schedule and keep every visit on track.',
    Patients: 'Keep patient details and care assignments organized.',
    Doctors: 'Your care team, specialties, and availability.',
    Billing: 'Track invoices and follow up on outstanding balances.',
  }[section]
}

function Dashboard({ records, today, todayAppointments, onNavigate, onNewAppointment }) {
  const waiting = todayAppointments.filter((item) => item.status === 'Waiting').length
  const totalBilled = records.invoices.reduce((sum, item) => sum + item.amount, 0)
  const paid = records.invoices.filter((item) => item.status === 'Paid').reduce((sum, item) => sum + item.amount, 0)
  const hours = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM']
  const hourlyCounts = hours.map((_, index) => todayAppointments.filter((appointment) => new Date(appointment.date).getHours() === index + 8).length)
  const maxHourlyCount = Math.max(...hourlyCounts, 1)
  const bars = hourlyCounts.map((count) => count ? Math.max(12, (count / maxHourlyCount) * 100) : 0)
  return <>
    <div className="metric-grid">
      <Metric icon="patients" label="Total patients" value={records.patients.length} note="In your directory" tone="blue" />
      <Metric icon="calendar" label="Today's appointments" value={todayAppointments.length} note={`${waiting} waiting to be seen`} tone="purple" />
      <Metric icon="doctors" label="Available doctors" value={records.doctors.filter((doctor) => doctor.status === 'On duty').length} note={`of ${records.doctors.length} on the team`} tone="green" />
      <Metric icon="billing" label="Outstanding billing" value={`$${(totalBilled - paid).toLocaleString()}`} note="Across unpaid invoices" tone="orange" />
    </div>
    <div className="dashboard-grid">
      <section className="panel schedule-panel">
        <div className="panel-heading"><div><h2>Today's schedule</h2><p>{formatDate(today, { weekday: 'long', month: 'long', day: 'numeric' })}</p></div><button className="text-link" onClick={() => onNavigate('Appointments')}>View all <Icon name="arrow" size={16} /></button></div>
        {todayAppointments.length === 0 ? <EmptyState
          title={records.patients.length && records.doctors.length ? 'No appointments today' : 'Set up your clinic'}
          message={records.patients.length && records.doctors.length ? 'Your schedule is clear. Add a new visit to get started.' : 'Add a doctor and a patient to start scheduling appointments.'}
          action={records.doctors.length ? 'Add a patient' : 'Add a doctor'}
          onAction={() => onNavigate(records.doctors.length ? 'Patients' : 'Doctors')} /> :
          <div className="schedule-list">{todayAppointments.slice(0, 5).map((appointment, index) => <div className="schedule-row" key={appointment.id}>
            <div className="schedule-time">{formatTime(appointment.date)}</div><div className={`schedule-line line-${index % 4}`} />
            <Avatar name={personName(records.patients, appointment.patientId)} tone={index} />
            <div className="schedule-detail"><strong>{personName(records.patients, appointment.patientId)}</strong><span>{personName(records.doctors, appointment.doctorId)} · {appointment.reason}</span></div>
            <StatusBadge>{appointment.status}</StatusBadge>
          </div>)}</div>}
        <button className="schedule-add" onClick={onNewAppointment}><Icon name="plus" size={16} /> Schedule an appointment</button>
      </section>
      <section className="panel activity-panel">
        <div className="panel-heading"><div><h2>Clinic activity</h2><p>Appointment volume today</p></div><button className="period-select" onClick={() => onNavigate('Appointments')}>Today⌄</button></div>
        <div className="chart-total"><strong>{todayAppointments.length}</strong><span>visits scheduled</span><span className="chart-trend">{todayAppointments.length ? 'Today' : 'No visits yet'}</span></div>
        <div className="bar-chart" aria-label="Appointment volume by hour">{bars.map((height, index) => <div className="bar-column" key={hours[index]}><div className="bar-track"><span style={{ height: `${height}%` }} /></div><small>{hours[index]}</small></div>)}</div>
        <div className="chart-legend"><span><i /> Appointments</span><span>Peak hour <strong>{maxHourlyCount > 1 ? hours[hourlyCounts.indexOf(maxHourlyCount)] : '—'}</strong></span></div>
      </section>
      <section className="panel appointments-panel">
        <div className="panel-heading"><div><h2>Upcoming appointments</h2><p>Your next visits</p></div><button className="text-link" onClick={() => onNavigate('Appointments')}>See schedule <Icon name="arrow" size={16} /></button></div>
        <div className="upcoming-list">{records.appointments.filter((item) => item.status !== 'Cancelled').sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4).map((item, index) => <div className="upcoming-row" key={item.id}>
          <div className="upcoming-date"><strong>{formatDate(item.date, { day: '2-digit' })}</strong><span>{formatDate(item.date, { month: 'short' })}</span></div>
          <Avatar name={personName(records.patients, item.patientId)} tone={index + 1} />
          <div className="schedule-detail"><strong>{personName(records.patients, item.patientId)}</strong><span>{personName(records.doctors, item.doctorId)} · {formatTime(item.date)}</span></div>
          <StatusBadge>{item.status}</StatusBadge>
        </div>)}{!records.appointments.length && <p className="inline-empty">No visits have been scheduled yet.</p>}</div>
      </section>
      <section className="panel team-panel">
        <div className="panel-heading"><div><h2>Your care team</h2><p>{records.doctors.length} specialists</p></div><button className="text-link" onClick={() => onNavigate('Doctors')}>View team <Icon name="arrow" size={16} /></button></div>
        <div className="team-list">{records.doctors.slice(0, 4).map((doctor, index) => <div className="team-row" key={doctor.id}><Avatar name={doctor.name} tone={index + 2} /><div className="schedule-detail"><strong>{doctor.name}</strong><span>{doctor.specialty}</span></div><span className={`availability ${doctor.status === 'On duty' ? 'available' : ''}`}><i />{doctor.status}</span></div>)}</div>
      </section>
    </div>
  </>
}

function Metric({ icon, label, value, note, tone }) {
  return <article className="metric-card"><span className={`metric-icon metric-${tone}`}><Icon name={icon} size={20} /></span><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-note">{note}</span><span className="metric-spark" aria-hidden="true">⌁</span></article>
}

function Patients({ patients, records, onEdit }) {
  return <section className="panel data-panel"><div className="table-toolbar"><div><strong>{patients.length} patients</strong><span>Patient directory and care status</span></div><button className="filter-button" onClick={() => onEdit(patients[0])} disabled={!patients.length}>Quick edit <Icon name="edit" size={15} /></button></div>
    <div className="table-scroll"><table><thead><tr><th>Patient</th><th>Patient ID</th><th>Age / Gender</th><th>Condition</th><th>Assigned doctor</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
      {patients.map((patient, index) => <tr key={patient.id}><td><div className="person-cell"><Avatar name={patient.name} tone={index} /><span><strong>{patient.name}</strong><small>{patient.phone}</small></span></div></td><td className="id-cell">{patient.id}</td><td>{patient.age} yrs · {patient.gender}</td><td>{patient.condition}</td><td>{personName(records.doctors, patient.doctorId)}</td><td><StatusBadge>{patient.status}</StatusBadge></td><td><button className="row-action" aria-label={`Edit ${patient.name}`} onClick={() => onEdit(patient)}><Icon name="edit" size={16} /></button></td></tr>)}
    </tbody></table>{patients.length === 0 && <EmptyState title="No patients found" message="Try another search or add a patient to the directory." />}</div>
    <div className="table-footer"><span>Showing {patients.length} patients</span><span>Do not enter real patient information</span></div>
  </section>
}

function Doctors({ doctors, onEdit }) {
  return <section className="panel data-panel"><div className="table-toolbar"><div><strong>{doctors.length} care team members</strong><span>Manage specialties and availability</span></div><span className="team-summary"><i /> {doctors.filter((doctor) => doctor.status === 'On duty').length} on duty</span></div>
    <div className="table-scroll"><table><thead><tr><th>Doctor</th><th>Specialty</th><th>Contact</th><th>Availability</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
      {doctors.map((doctor, index) => <tr key={doctor.id}><td><div className="person-cell"><Avatar name={doctor.name} tone={index + 1} /><span><strong>{doctor.name}</strong><small>{doctor.id}</small></span></div></td><td><span className="specialty-chip">{doctor.specialty}</span></td><td><span>{doctor.email}</span><small className="table-subtext">{doctor.phone}</small></td><td>{doctor.availability || 'Schedule not set'}</td><td><StatusBadge>{doctor.status}</StatusBadge></td><td><button className="row-action" aria-label={`Edit ${doctor.name}`} onClick={() => onEdit(doctor)}><Icon name="edit" size={16} /></button></td></tr>)}
    </tbody></table>{doctors.length === 0 && <EmptyState title="No doctors found" message="Try another search or add a doctor to the care team." />}</div>
    <div className="table-footer"><span>Showing {doctors.length} team members</span><span>Availability is managed locally in this demo</span></div>
  </section>
}

function Appointments({ appointments, records, onEdit, onStatus }) {
  return <section className="panel data-panel"><div className="table-toolbar"><div><strong>{appointments.length} appointments</strong><span>Review, update, and manage visit status</span></div><span className="team-summary"><Icon name="clock" size={16} /> {appointments.filter((item) => item.status === 'Waiting').length} waiting</span></div>
    <div className="table-scroll"><table><thead><tr><th>Patient</th><th>Date &amp; time</th><th>Provider</th><th>Visit reason</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {appointments.map((item, index) => <tr key={item.id}><td><div className="person-cell"><Avatar name={personName(records.patients, item.patientId)} tone={index + 1} /><span><strong>{personName(records.patients, item.patientId)}</strong><small>{item.id}</small></span></div></td><td><strong>{formatDate(item.date, { month: 'short', day: 'numeric' })}</strong><small className="table-subtext">{formatTime(item.date)}</small></td><td>{personName(records.doctors, item.doctorId)}</td><td>{item.reason}</td><td><StatusBadge>{item.status}</StatusBadge></td><td><div className="row-actions"><button className="row-action" aria-label={`Edit ${item.id}`} onClick={() => onEdit(item)}><Icon name="edit" size={16} /></button>{item.status !== 'Completed' && item.status !== 'Cancelled' && <button className="action-text" onClick={() => onStatus(item.id, 'Completed')}>Complete</button>}</div></td></tr>)}
    </tbody></table>{appointments.length === 0 && <EmptyState title="No appointments found" message="Try another search or schedule a new visit." />}</div>
    <div className="table-footer"><span>Showing {appointments.length} appointments</span><span>Use Complete to update a visit status</span></div>
  </section>
}

function Billing({ invoices, records, onToggle }) {
  const outstanding = invoices.filter((invoice) => invoice.status !== 'Paid').reduce((sum, invoice) => sum + invoice.amount, 0)
  return <><div className="billing-summary"><div className="billing-summary-card"><span>Outstanding balance</span><strong>${outstanding.toLocaleString()}</strong><small>Unpaid and overdue invoices in this view</small></div><div className="billing-summary-card"><span>Invoices shown</span><strong>{invoices.length}</strong><small>Use search to find an invoice or patient</small></div></div>
    <section className="panel data-panel"><div className="table-toolbar"><div><strong>Invoices</strong><span>Review payment status and visit charges</span></div></div><div className="table-scroll"><table><thead><tr><th>Invoice</th><th>Patient</th><th>Date issued</th><th>Description</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead><tbody>
      {invoices.map((invoice) => <tr key={invoice.id}><td className="id-cell">{invoice.id}</td><td>{personName(records.patients, invoice.patientId)}</td><td>{formatDate(invoice.date)}</td><td>{invoice.description}</td><td className="amount-cell">${invoice.amount.toLocaleString()}</td><td><StatusBadge>{invoice.status}</StatusBadge></td><td><button className="action-text" onClick={() => onToggle(invoice.id)}>{invoice.status === 'Paid' ? 'Mark pending' : 'Mark paid'}</button></td></tr>)}
    </tbody></table>{invoices.length === 0 && <EmptyState title="No invoices found" message="Try another search to find an invoice." />}</div>
      <div className="table-footer"><span>Payment actions are for demo purposes only</span><span>No payment provider is connected</span></div>
    </section>
  </>
}

function EmptyState({ title, message, action, onAction }) {
  return <div className="empty-state"><span className="empty-icon"><Icon name="search" size={20} /></span><strong>{title}</strong><p>{message}</p>{action && <button className="button button-primary" onClick={onAction}><Icon name="plus" size={17} />{action}</button>}</div>
}

function RecordModal({ modal, records, onClose, onSave }) {
  const kind = modal.kind
  const item = modal.item || {}
  const title = `${item.id ? 'Edit' : kind === 'invoice' ? 'Create' : 'Add'} ${kind === 'patient' ? 'patient' : kind === 'doctor' ? 'doctor' : kind === 'invoice' ? 'invoice' : 'appointment'}`
  const [defaultAppointmentDate] = useState(() => {
    const date = new Date()
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
    return date.toISOString().slice(0, 16)
  })
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-header"><div><span className="eyebrow">CAREPOINT · {item.id || 'NEW RECORD'}</span><h2 id="modal-title">{title}</h2><p>{kind === 'patient' ? 'Add patient details and assign a care provider.' : kind === 'doctor' ? 'Add a specialist to your care team.' : kind === 'invoice' ? 'Record a patient charge and its payment status.' : 'Coordinate a patient visit with your care team.'}</p></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>
      <form onSubmit={(event) => { event.preventDefault(); onSave(kind, new FormData(event.currentTarget)) }}>
        {kind === 'patient' && <div className="form-grid">
          <label className="form-field form-span"><span>Full name</span><input name="name" defaultValue={item.name || ''} required autoFocus placeholder="e.g. Jordan Lee" /></label>
          <label className="form-field"><span>Age</span><input name="age" type="number" min="0" max="125" defaultValue={item.age ?? ''} required placeholder="Age" /></label>
          <label className="form-field"><span>Gender</span><select name="gender" defaultValue={item.gender || 'Female'}><option>Female</option><option>Male</option><option>Non-binary</option><option>Prefer not to say</option></select></label>
          <label className="form-field form-span"><span>Phone number</span><input name="phone" type="tel" defaultValue={item.phone || ''} required placeholder="(555) 010-0000" /></label>
          <label className="form-field form-span"><span>Primary condition / visit reason</span><input name="condition" defaultValue={item.condition || ''} required placeholder="e.g. Annual checkup" /></label>
          <label className="form-field"><span>Assigned doctor</span><select name="doctorId" defaultValue={item.doctorId || records.doctors[0]?.id || ''}><option value="">No doctor assigned</option>{records.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></label>
          <label className="form-field"><span>Care status</span><select name="status" defaultValue={item.status || 'Stable'}><option>Stable</option><option>Under care</option><option>Needs follow-up</option></select></label>
        </div>}
        {kind === 'doctor' && <div className="form-grid">
          <label className="form-field form-span"><span>Full name</span><input name="name" defaultValue={item.name || ''} required autoFocus placeholder="e.g. Dr. Jordan Lee" /></label>
          <label className="form-field form-span"><span>Specialty</span><input name="specialty" defaultValue={item.specialty || ''} required placeholder="e.g. Family medicine" /></label>
          <label className="form-field"><span>Email</span><input name="email" type="email" defaultValue={item.email || ''} required placeholder="doctor@carepoint.demo" /></label>
          <label className="form-field"><span>Phone</span><input name="phone" type="tel" defaultValue={item.phone || ''} required placeholder="(555) 010-0000" /></label>
          <label className="form-field"><span>Availability status</span><select name="status" defaultValue={item.status || 'On duty'}><option>On duty</option><option>Off duty</option></select></label>
          <label className="form-field"><span>Schedule</span><input name="availability" defaultValue={item.availability || ''} placeholder="e.g. Weekdays, 9 AM – 5 PM" /></label>
        </div>}
        {kind === 'appointment' && <div className="form-grid">
          <label className="form-field form-span"><span>Patient</span><select name="patientId" defaultValue={item.patientId || records.patients[0]?.id || ''} required>{records.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.id}</option>)}</select></label>
          <label className="form-field form-span"><span>Doctor</span><select name="doctorId" defaultValue={item.doctorId || records.doctors[0]?.id || ''} required>{records.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialty}</option>)}</select></label>
          <label className="form-field form-span"><span>Date and time</span><input name="date" type="datetime-local" defaultValue={item.date || defaultAppointmentDate} required /></label>
          <label className="form-field form-span"><span>Reason for visit</span><input name="reason" defaultValue={item.reason || ''} required placeholder="e.g. Follow-up consultation" /></label>
          <label className="form-field form-span"><span>Status</span><select name="status" defaultValue={item.status || 'Confirmed'}><option>Confirmed</option><option>Waiting</option><option>Completed</option><option>Cancelled</option></select></label>
        </div>}
        {kind === 'invoice' && <div className="form-grid">
          <label className="form-field form-span"><span>Patient</span><select name="patientId" defaultValue={item.patientId || records.patients[0]?.id || ''} required>{records.patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} · {patient.id}</option>)}</select></label>
          <label className="form-field"><span>Date issued</span><input name="date" type="date" defaultValue={item.date || defaultAppointmentDate.slice(0, 10)} required /></label>
          <label className="form-field"><span>Amount ($)</span><input name="amount" type="number" min="0.01" step="0.01" defaultValue={item.amount ?? ''} required placeholder="0.00" /></label>
          <label className="form-field form-span"><span>Description</span><input name="description" defaultValue={item.description || ''} required placeholder="e.g. Consultation" /></label>
          <label className="form-field form-span"><span>Payment status</span><select name="status" defaultValue={item.status || 'Pending'}><option>Pending</option><option>Paid</option><option>Overdue</option></select></label>
        </div>}
        <div className="modal-footer"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button button-primary"><Icon name="check" size={17} />{item.id ? 'Save changes' : kind === 'invoice' ? 'Create invoice' : 'Create record'}</button></div>
      </form>
    </section>
  </div>
}

export default App
