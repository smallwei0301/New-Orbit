/**
 * Redux Toolkit store — six slices matching the production app:
 *   constants · me · org · modals · planBanner · ui
 */
import { configureStore, createSlice } from '@reduxjs/toolkit'

const constants = createSlice({
  name: 'constants',
  initialState: { data: null },
  reducers: { setConstants: (s, a) => void (s.data = a.payload) },
})

const me = createSlice({
  name: 'me',
  initialState: { user: null, staff: [], blockedOrgIds: [], isSuperUser: false },
  reducers: {
    setMe: (s, a) => Object.assign(s, a.payload),
    clearMe: (s) => Object.assign(s, { user: null, staff: [], blockedOrgIds: [], isSuperUser: false }),
    updateUser: (s, a) => void (s.user = { ...s.user, ...a.payload }),
  },
})

const org = createSlice({
  name: 'org',
  initialState: { current: null },
  reducers: {
    setOrg: (s, a) => void (s.current = a.payload),
    clearOrg: (s) => void (s.current = null),
  },
})

const modals = createSlice({
  name: 'modals',
  initialState: { lineBinding: null, customerOrders: null, resourceUsage: null },
  reducers: {
    openModal: (s, a) => void (s[a.payload.key] = a.payload.data),
    closeModal: (s, a) => void (s[a.payload] = null),
  },
})

const planBanner = createSlice({
  name: 'planBanner',
  initialState: { visible: false, requiredPlan: null, requiredPlanDisplayName: '', currentPlan: null },
  reducers: {
    showPlanRequired: (s, a) => Object.assign(s, { visible: true, ...a.payload }),
    hidePlanBanner: (s) => void (s.visible = false),
  },
})

const ui = createSlice({
  name: 'ui',
  initialState: { itemsExpandedIds: {}, itemsListSearch: {} },
  reducers: {
    toggleItemExpanded: (s, a) => {
      const { orgSlug, id } = a.payload
      const set = s.itemsExpandedIds[orgSlug] || {}
      set[id] = !set[id]
      s.itemsExpandedIds[orgSlug] = set
    },
    setItemsListSearch: (s, a) => void (s.itemsListSearch[a.payload.orgSlug] = a.payload.value),
  },
})

export const { setConstants } = constants.actions
export const { setMe, clearMe, updateUser } = me.actions
export const { setOrg, clearOrg } = org.actions
export const { openModal, closeModal } = modals.actions
export const { showPlanRequired, hidePlanBanner } = planBanner.actions
export const { toggleItemExpanded, setItemsListSearch } = ui.actions

export const store = configureStore({
  reducer: {
    constants: constants.reducer,
    me: me.reducer,
    org: org.reducer,
    modals: modals.reducer,
    planBanner: planBanner.reducer,
    ui: ui.reducer,
  },
})
