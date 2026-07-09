// Google Calendar Integration
// This file provides functions to sync with Google Calendar

const GOOGLE_API_BASE = 'https://www.googleapis.com/calendar/v3'
const SCOPES = 'https://www.googleapis.com/auth/calendar'

let accessToken: string | null = null

export async function initGoogleCalendar(): Promise<boolean> {
  try {
    // Check if Google API is loaded
    if (typeof window.gapi === 'undefined') {
      console.warn('Google API not loaded')
      return false
    }
    
    await new Promise<void>((resolve) => {
      window.gapi.load('client:auth2', () => resolve())
    })
    
    await window.gapi.client.init({
      apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
      scope: SCOPES,
    })
    
    return true
  } catch (error) {
    console.error('Error initializing Google Calendar:', error)
    return false
  }
}

export async function signInToGoogle(): Promise<boolean> {
  try {
    const authInstance = window.gapi.auth2.getAuthInstance()
    if (!authInstance) return false
    
    const user = await authInstance.signIn()
    accessToken = user.getAuthResponse().access_token
    return true
  } catch (error) {
    console.error('Error signing in to Google:', error)
    return false
  }
}

export async function createCalendarEvent(event: {
  summary: string
  description?: string
  start: { date: string; timeZone?: string }
  end: { date: string; timeZone?: string }
}): Promise<string | null> {
  try {
    if (!accessToken) {
      await signInToGoogle()
    }
    
    const response = await fetch(`${GOOGLE_API_BASE}/primary/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })
    
    const data = await response.json()
    return data.id
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return null
  }
}

export async function updateCalendarEvent(
  eventId: string,
  event: {
    summary?: string
    description?: string
    start?: { date: string; timeZone?: string }
    end?: { date: string; timeZone?: string }
  }
): Promise<boolean> {
  try {
    if (!accessToken) {
      await signInToGoogle()
    }
    
    await fetch(`${GOOGLE_API_BASE}/primary/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })
    
    return true
  } catch (error) {
    console.error('Error updating calendar event:', error)
    return false
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    if (!accessToken) {
      await signInToGoogle()
    }
    
    await fetch(`${GOOGLE_API_BASE}/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    
    return true
  } catch (error) {
    console.error('Error deleting calendar event:', error)
    return false
  }
}

export async function getCalendarEvents(
  timeMin: string,
  timeMax: string
): Promise<unknown[]> {
  try {
    if (!accessToken) {
      await signInToGoogle()
    }
    
    const response = await fetch(
      `${GOOGLE_API_BASE}/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    
    const data = await response.json()
    return data.items || []
  } catch (error) {
    console.error('Error getting calendar events:', error)
    return []
  }
}

// Type declaration for gapi
declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void
      client: {
        init: (config: Record<string, unknown>) => Promise<void>
      }
      auth2: {
        getAuthInstance: () => {
          signIn: () => Promise<{
            getAuthResponse: () => { access_token: string }
          }>
        }
      }
    }
  }
}
