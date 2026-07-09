// Google Sheets Integration
// This file provides functions to sync data with Google Sheets

const GOOGLE_SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

let accessToken: string | null = null

export async function setAccessToken(token: string) {
  accessToken = token
}

export async function createSpreadsheet(
  title: string
): Promise<string | null> {
  try {
    if (!accessToken) return null
    
    const response = await fetch(`${GOOGLE_SHEETS_API_BASE}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title },
      }),
    })
    
    const data = await response.json()
    return data.spreadsheetId
  } catch (error) {
    console.error('Error creating spreadsheet:', error)
    return null
  }
}

export async function getSpreadsheet(
  spreadsheetId: string
): Promise<unknown | null> {
  try {
    if (!accessToken) return null
    
    const response = await fetch(
      `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    
    return await response.json()
  } catch (error) {
    console.error('Error getting spreadsheet:', error)
    return null
  }
}

export async function appendRows(
  spreadsheetId: string,
  range: string,
  values: unknown[][]
): Promise<boolean> {
  try {
    if (!accessToken) return false
    
    const response = await fetch(
      `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values,
        }),
      }
    )
    
    return response.ok
  } catch (error) {
    console.error('Error appending rows:', error)
    return false
  }
}

export async function updateRows(
  spreadsheetId: string,
  range: string,
  values: unknown[][]
): Promise<boolean> {
  try {
    if (!accessToken) return false
    
    const response = await fetch(
      `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values,
        }),
      }
    )
    
    return response.ok
  } catch (error) {
    console.error('Error updating rows:', error)
    return false
  }
}

export async function getRows(
  spreadsheetId: string,
  range: string
): Promise<unknown[][] | null> {
  try {
    if (!accessToken) return null
    
    const response = await fetch(
      `${GOOGLE_SHEETS_API_BASE}/${spreadsheetId}/values/${range}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    
    const data = await response.json()
    return data.values
  } catch (error) {
    console.error('Error getting rows:', error)
    return null
  }
}

// Helper functions for data transformation
export function clientsToSheetRows(clients: any[]): any[][] {
  return clients.map(client => [
    client.id,
    client.razon_social || '',
    client.no_cliente || '',
    client.rfc || '',
    client.poblacion || '',
    client.estado || '',
    client.ramo || '',
    client.educador_asignado || '',
  ])
}

export function visitsToSheetRows(visits: any[]): any[][] {
  return visits.map(visit => [
    visit.id,
    visit.cliente_id || '',
    visit.educador_id || '',
    visit.status || '',
    visit.fecha_visita || '',
    visit.hora_visita || '',
    visit.hospital || '',
    visit.objetivo || '',
    visit.fecha_llegada || '',
    visit.fecha_salida || '',
  ])
}

export function activitiesToSheetRows(activities: any[]): any[][] {
  return activities.map(activity => [
    activity.id,
    activity.visita_id || '',
    activity.tipo_actividad_id || '',
    activity.estado_actividad || '',
    activity.estado_evidencia || '',
    activity.requiere_evidencia ? 'Sí' : 'No',
  ])
}

// Sheet headers
export const CLIENTS_HEADERS = [
  'ID',
  'Razón Social',
  'No. Cliente',
  'RFC',
  'Población',
  'Estado',
  'Ramo',
  'Educador',
]

export const VISITS_HEADERS = [
  'ID',
  'ID Cliente',
  'ID Educador',
  'Estado',
  'Fecha Visita',
  'Hora Visita',
  'Hospital',
  'Objetivo',
  'Fecha Llegada',
  'Fecha Salida',
]

export const ACTIVITIES_HEADERS = [
  'ID',
  'ID Visita',
  'Tipo Actividad',
  'Estado Actividad',
  'Estado Evidencia',
  'Requiere Evidencia',
]
