import { sdk } from '@farcaster/miniapp-sdk'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

interface UserData {
  fid: number
  displayName: string
  username: string
  pfpUrl?: string
  primaryAddress?: string
}

export function useQuickAuth(isInFarcaster: boolean): void {
  const hasAuthenticated = useRef(false)

  useEffect(() => {
    const authenticateUser = async (): Promise<void> => {
      try {
        if (!isInFarcaster) return
        
        if (hasAuthenticated.current) return
        hasAuthenticated.current = true
        
        const response: Response = await sdk.quickAuth.fetch('/api/me')
        
        if (response.ok) {
          const userData: UserData = await response.json()
          
          toast.success('Quick Auth Successful! 🎉', {
            description: (
              <div className="flex flex-col gap-2 mt-2 text-black">
                <div className="flex items-center gap-3">
                  {userData.pfpUrl && (
                    <img 
                      src={userData.pfpUrl} 
                      alt="Profile" 
                      className="w-12 h-12 rounded-full border-2 border-black"
                    />
                  )}
                  <div>
                    <div className="font-semibold text-black">{userData.displayName}</div>
                    <div className="text-sm text-black/70">@{userData.username}</div>
                  </div>
                </div>
                <div className="text-sm space-y-1 text-black">
                  <div><span className="font-medium">FID:</span> {userData.fid}</div>
                  {userData.primaryAddress && (
                    <div>
                      <span className="font-medium">Address:</span>{' '}
                      {userData.primaryAddress.slice(0, 6)}...{userData.primaryAddress.slice(-4)}
                    </div>
                  )}
                </div>
              </div>
            ),
            duration: 3000,
            className: 'border-2 border-black',
            style: {
              borderColor: '#000000',
              borderWidth: '2px',
            },
          })
        } else {
          toast.error('Authentication failed', {
            description: 'Unable to verify your Farcaster identity',
            className: 'border-2 border-black text-black',
            style: {
              borderColor: '#000000',
              borderWidth: '2px',
            },
          })
        }
      } catch (error) {
        console.error('Quick Auth error:', error)
        toast.error('Authentication error', {
          description: error instanceof Error ? error.message : 'An unexpected error occurred',
          className: 'border-2 border-black text-black',
          style: {
            borderColor: '#000000',
            borderWidth: '2px',
          },
        })
      }
    }

    authenticateUser()
  }, [isInFarcaster])
}
