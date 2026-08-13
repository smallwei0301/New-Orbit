// tiny classnames helper (avoids an extra dependency)
export function clsx(...args) {
  return args.flat().filter(Boolean).join(' ')
}
