// Google Drive Integration
// This file provides functions to sync with Google Drive

const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'
const GOOGLE_DRIVE_UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3'

let accessToken: string | null = null

export async function setAccessToken(token: string) {
  accessToken = token
}

export async function getOrCreateFolder(
  folderName: string,
  parentFolderId?: string
): Promise<string | null> {
  try {
    if (!accessToken) return null
    
    // Search for existing folder
    const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    const parentQuery = parentFolderId ? ` and '${parentFolderId}' in parents` : ''
    
    const searchResponse = await fetch(
      `${GOOGLE_DRIVE_API_BASE}/files?q=${encodeURIComponent(query + parentQuery)}&fields=files(id)`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    
    const searchData = await searchResponse.json()
    
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id
    }
    
    // Create new folder
    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentFolderId ? [parentFolderId] : undefined,
    }
    
    const createResponse = await fetch(`${GOOGLE_DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    })
    
    const createData = await createResponse.json()
    return createData.id
  } catch (error) {
    console.error('Error getting/creating folder:', error)
    return null
  }
}

export async function uploadFile(
  file: File,
  folderId: string,
  fileName?: string
): Promise<{ id: string; webViewLink: string } | null> {
  try {
    if (!accessToken) return null
    
    const metadata = {
      name: fileName || file.name,
      parents: [folderId],
    }
    
    const formData = new FormData()
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    formData.append('file', file)
    
    const response = await fetch(
      `${GOOGLE_DRIVE_UPLOAD_API_BASE}/files?uploadType=multipart`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    )
    
    const data = await response.json()
    
    // Get view link
    const linkResponse = await fetch(
      `${GOOGLE_DRIVE_API_BASE}/files/${data.id}?fields=webViewLink`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    
    const linkData = await linkResponse.json()
    
    return {
      id: data.id,
      webViewLink: linkData.webViewLink,
    }
  } catch (error) {
    console.error('Error uploading file:', error)
    return null
  }
}

export async function deleteFile(fileId: string): Promise<boolean> {
  try {
    if (!accessToken) return false
    
    await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    
    return true
  } catch (error) {
    console.error('Error deleting file:', error)
    return false
  }
}

export async function getFileMetadata(fileId: string): Promise<unknown | null> {
  try {
    if (!accessToken) return null
    
    const response = await fetch(
      `${GOOGLE_DRIVE_API_BASE}/files/${fileId}?fields=id,name,mimeType,createdTime,modifiedTime,size,webViewLink`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    
    return await response.json()
  } catch (error) {
    console.error('Error getting file metadata:', error)
    return null
  }
}

// Helper function to generate file name for evidence
export function generateEvidenceFileName(
  clientName: string,
  date: string,
  activityType: string,
  extension: string
): string {
  const cleanClientName = clientName
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 30)
  
  const formattedDate = date.replace(/-/g, '')
  
  const cleanActivityType = activityType
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 20)
  
  return `${cleanClientName}_${formattedDate}_${cleanActivityType}.${extension}`
}
