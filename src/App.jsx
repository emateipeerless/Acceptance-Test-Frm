import { useState } from 'react'
import { saveAcceptanceTest } from './api'
import fcLogo from './FClogo.png'
import './App.css'

const NUMERIC_HEADER_FIELDS = new Set([
  'pumpRatedGpm',
  'pumpRatedRpm',
  'pumpRatedPsi',
  'driverRatedHp',
  'driverRatedRpm',
  'startPsi',
  'jockeyPumpVoltage',
  'jockeyPumpHp',
])

const SECTIONS = [
  {
    title: 'Site Information',
    fields: [
      { name: 'storeNumber', label: 'Store #', type: 'text', required: true },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'state', label: 'State', type: 'text' },
    ],
  },
  {
    title: 'Acceptance Test',
    fields: [
      { name: 'acceptanceTestDate', label: 'Acceptance Test Date', type: 'date' },
    ],
  },
  {
    title: 'Pump Information',
    fields: [
      { name: 'pumpMake', label: 'Pump Make', type: 'text' },
      { name: 'pumpType', label: 'Pump Type', type: 'text' },
      { name: 'pumpPosition', label: 'Pump Position', type: 'text' },
      { name: 'pumpModel', label: 'Pump Model', type: 'text' },
      { name: 'pumpSerial', label: 'Pump Serial', type: 'text' },
      { name: 'pumpRatedGpm', label: 'Pump Rated GPM', type: 'number' },
      { name: 'pumpRatedRpm', label: 'Pump Rated RPM', type: 'number' },
      { name: 'pumpRatedPsi', label: 'Pump Rated PSI', type: 'number' },
      { name: 'pumpSuction', label: 'Pump Suction', type: 'text' },
    ],
  },
  {
    title: 'Driver Information',
    fields: [
      { name: 'driverType', label: 'Driver Type', type: 'text' },
      { name: 'driverManufacturer', label: 'Driver Manufacturer', type: 'text' },
      { name: 'driverSerial', label: 'Driver Serial', type: 'text' },
      { name: 'driverModel', label: 'Driver Model', type: 'text' },
      { name: 'driverRatedHp', label: 'Driver Rated HP', type: 'number' },
      { name: 'driverRatedRpm', label: 'Driver Rated RPM', type: 'number' },
    ],
  },
  {
    title: 'Controller Information',
    fields: [
      { name: 'controllerManufacturer', label: 'Controller Manufacturer', type: 'text' },
      { name: 'controllerModel', label: 'Controller Model', type: 'text' },
      { name: 'controllerSerial', label: 'Controller Serial', type: 'text' },
      { name: 'startPsi', label: 'Start PSI', type: 'number' },
      { name: 'startMethod', label: 'Start Method', type: 'text' },
      { name: 'transferSwitch', label: 'Transfer Switch', type: 'text' },
      { name: 'upstreamDisconnect', label: 'Upstream Disconnect', type: 'text' },
    ],
  },
  {
    title: 'Jockey Pump Information',
    fields: [
      { name: 'jockeyPumpManufacturer', label: 'Jockey Pump Manufacturer', type: 'text' },
      { name: 'jockeyPumpSize', label: 'Jockey Pump Size', type: 'text' },
      { name: 'jockeyPumpVoltage', label: 'Jockey Pump Voltage', type: 'number' },
      { name: 'jockeyPumpHp', label: 'Jockey Pump HP', type: 'number' },
    ],
  },
]

const TEST_POINTS = [
  { key: 'churn', label: 'Churn (0%)' },
  { key: 'rated', label: 'Rated (100%)' },
  { key: 'overflow', label: 'Overflow (150%)' },
]

const TEST_METRICS = [
  { key: 'speedRpm', label: 'Speed (RPM)' },
  { key: 'suctionPsi', label: 'Suction (PSI)' },
  { key: 'dischargePsi', label: 'Discharge (PSI)' },
  { key: 'flowGpm', label: 'Flow (GPM)' },
]

function getStoreNumberFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('storeNumber') || params.get('store') || params.get('storeId') || ''
}

function createInitialValues() {
  const values = SECTIONS.flatMap((section) => section.fields).reduce((acc, field) => {
    acc[field.name] = ''
    return acc
  }, {})
  values.storeNumber = getStoreNumberFromUrl()
  return values
}

function isFixedReading(metricKey, pointKey) {
  return metricKey === 'flowGpm' && pointKey === 'churn'
}

function createInitialTestReadings() {
  return TEST_METRICS.reduce((readings, metric) => {
    readings[metric.key] = TEST_POINTS.reduce((points, point) => {
      points[point.key] = isFixedReading(metric.key, point.key) ? '0' : ''
      return points
    }, {})
    return readings
  }, {})
}

function emptyToNull(value) {
  if (value == null) return null
  const text = String(value).trim()
  return text === '' ? null : text
}

function toNumberOrNull(value) {
  const cleaned = emptyToNull(value)
  if (cleaned == null) return null
  const number = Number(cleaned)
  if (Number.isNaN(number)) {
    throw new Error(`Invalid numeric value: ${value}`)
  }
  return number
}

function buildAcceptanceTestPayload(formValues) {
  const acceptanceTest = {}
  for (const [name, value] of Object.entries(formValues)) {
    acceptanceTest[name] = NUMERIC_HEADER_FIELDS.has(name)
      ? toNumberOrNull(value)
      : emptyToNull(value)
  }
  return acceptanceTest
}

function buildReadingsPayload(testReadings) {
  return TEST_POINTS.reduce((readings, point) => {
    readings[point.key] = TEST_METRICS.reduce((metrics, metric) => {
      metrics[metric.key] = isFixedReading(metric.key, point.key)
        ? 0
        : toNumberOrNull(testReadings[metric.key][point.key])
      return metrics
    }, {})
    return readings
  }, {})
}

export default function App() {
  const [formValues, setFormValues] = useState(createInitialValues)
  const [testReadings, setTestReadings] = useState(createInitialTestReadings)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

  function handleChange(event) {
    const { name, value } = event.target
    setFormValues((current) => ({ ...current, [name]: value }))
  }

  function handleTestReadingChange(metricKey, pointKey, value) {
    setTestReadings((current) => ({
      ...current,
      [metricKey]: {
        ...current[metricKey],
        [pointKey]: value,
      },
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const storeNumber = String(formValues.storeNumber || '').trim()
    if (!storeNumber) {
      setStatus({ type: 'error', message: 'Store # is required.' })
      return
    }

    setSaving(true)
    setStatus(null)

    try {
      const result = await saveAcceptanceTest({
        storeNumber,
        acceptanceTest: buildAcceptanceTestPayload(formValues),
        readings: buildReadingsPayload(testReadings),
      })
      setStatus({
        type: 'success',
        message: result.message || `Acceptance test saved for store ${storeNumber}.`,
      })
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Save failed.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <img className="page-logo" src={fcLogo} alt="Peerless FireConnect" />
        <h1>Home Depot Acceptance Test Form</h1>
        <p className="subtitle">
          Enter site, pump, driver, controller, jockey pump, and test reading details.
        </p>
      </header>

      <form className="form" onSubmit={handleSubmit}>
        {SECTIONS.map((section) => (
          <section key={section.title} className="card">
            <h2>{section.title}</h2>
            <div className={`field-grid ${section.fields.length === 1 ? 'single' : ''}`}>
              {section.fields.map((field) => (
                <label key={field.name} className="field">
                  <span>{field.label}</span>
                  <input
                    name={field.name}
                    type={field.type}
                    value={formValues[field.name]}
                    onChange={handleChange}
                    autoComplete="off"
                    required={Boolean(field.required)}
                    disabled={saving}
                  />
                </label>
              ))}
            </div>
          </section>
        ))}

        <section className="card">
          <h2>Acceptance Test Readings</h2>
          <div className="readings-table-wrap">
            <table className="readings-table">
              <thead>
                <tr>
                  <th scope="col">Measurement</th>
                  {TEST_POINTS.map((point) => (
                    <th key={point.key} scope="col">
                      {point.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TEST_METRICS.map((metric) => (
                  <tr key={metric.key}>
                    <th scope="row">{metric.label}</th>
                    {TEST_POINTS.map((point) => (
                      <td key={point.key}>
                        {isFixedReading(metric.key, point.key) ? (
                          <span className="fixed-reading">0</span>
                        ) : (
                          <input
                            type="number"
                            inputMode="decimal"
                            name={`${metric.key}_${point.key}`}
                            aria-label={`${metric.label} ${point.label}`}
                            value={testReadings[metric.key][point.key]}
                            onChange={(event) =>
                              handleTestReadingChange(metric.key, point.key, event.target.value)
                            }
                            autoComplete="off"
                            disabled={saving}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {status ? (
          <p className={`status-message ${status.type}`} role="status">
            {status.message}
          </p>
        ) : null}

        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save form'}
          </button>
        </div>
      </form>
    </div>
  )
}
