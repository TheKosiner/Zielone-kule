import { db } from '@/db/db'
import type { Photo, PhotoOwner } from '@/db/types'
import { compressImage } from '@/lib/image'
import { newId } from '@/lib/id'

export async function addPhotos(ownerType: PhotoOwner, ownerId: string, files: FileList | File[]): Promise<string[]> {
  const ids: string[] = []
  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/') && !/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)) continue
    const { blob, thumb, width, height } = await compressImage(file)
    const photo: Photo = { id: newId(), ownerType, ownerId, blob, thumb, width, height, createdAt: new Date().toISOString() }
    await db.photos.add(photo)
    ids.push(photo.id)
  }
  return ids
}

export async function deletePhoto(id: string): Promise<void> {
  await db.photos.delete(id)
}
