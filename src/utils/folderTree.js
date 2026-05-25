export const buildFolderTree = (pages = [], events = []) => {
  const tree = {
    folders: {},
    pages: []
  }

  const insertItem = (item, folderPath) => {
    if (!folderPath || folderPath.trim() === '') {
      tree.pages.push(item)
      return
    }

    const pathParts = folderPath.split('/').filter((part) => part.trim())
    let currentLevel = tree

    pathParts.forEach((folderName, index) => {
      if (!currentLevel.folders[folderName]) {
        currentLevel.folders[folderName] = {
          folders: {},
          pages: []
        }
      }

      if (index === pathParts.length - 1) {
        currentLevel.folders[folderName].pages.push(item)
      }

      currentLevel = currentLevel.folders[folderName]
    })
  }

  pages.forEach((page) => {
    insertItem({ ...page, type: 'page' }, page.folderPath)
  })

  events.forEach((event) => {
    insertItem(
      {
        ...event,
        type: 'event',
        title: event.name || event.title
      },
      event.folderPath
    )
  })

  return tree
}