/* @flow */
import { always, set, mod, toggle } from 'shades';
import { batch as reduxActBatch, createAction } from 'redux-act';

type $Action<P> = {type: string, payload: P}
type $ActionCreator<P> = (...inputs: Array<mixed>) => $Action<P>
type $Reducer<P, S: Object> = (payload: P) => (state: ?S) => ?S
type $ReducerMap<S: Object> = {[action: string]: $Reducer<*, S>}
type $SetterPayload = {field: string, value: any}


const _setField_ = ({field, value}: $SetterPayload) => set(field)(value)

const _toggleField_ = ({field, value}: $SetterPayload) => value === undefined 
  ? mod(field)(toggle) 
  : set(field)(value)

const last = a => b => b

const capitalize = s => s[0].toUpperCase() + s.slice(1)

export const batch = createAction('batch action handler for redux shades', 
  (...args) => args)

const createReducerFunction = <S: Object>(reducerObj: $ReducerMap<S>, initialState: ?S) =>
  // $FlowFixMe
  function reducer<P>(state: ?S = initialState, action: ?$Action<P>): ?S { 
    if (action 
      && (action.type === reduxActBatch.toString() || action.type === batch.toString())
      && Array.isArray(action.payload)) {

      return action.payload.reduce(reducer, state)
    }

    if (action && action.type) {
      return (reducerObj[action.type] || last)
      (action && action.payload)
      (state || initialState)
    }
    
    return state
  }


class ActionCreator<S: Object> {
  __extra: {
    reducerObj: $ReducerMap<S>,
    initialState: ?S,
    name: string,
    setField: (field: string, value: any) => $Action<$SetterPayload>,
    toggleField: (field: string, value: any) => $Action<$SetterPayload>,
  }
  reset: () => $Action<$SetterPayload>
  $reducer: ((state: ?S, action: ?$Action<?Object>) => ?S )

  constructor(reducerObj: $ReducerMap<S>, initialState: ?S, name: string, reducer: *) {
    this.$reducer = reducer
    this.__extra = {
      reducerObj,
      initialState,
      name,
    }

    this._initializeActions()
  }

  _initializeActions() {
    this.__extra.setField = this.$register('__set')
      (createAction(`Setter for ${this.__extra.name}`, (field, value) => ({field, value})))
      (_setField_)

    this.__extra.toggleField = this.$register('__toggle')
      (createAction(`Toggler for ${this.__extra.name}`, (field, value) => ({field, value})))
      (_toggleField_)

    this.reset = this.$registerConstant('__reset')
      (createAction(`Reset for ${this.__extra.name}`))
      (always(this.__extra.initialState))

    if (this.__extra.initialState) {
      this.$addSettersFromKeys(Object.keys(this.__extra.initialState))
    }
  }

  $add(name: string) {
    return (action: Function) => {
      // $FlowFixMe
      this[name] = action
    }
  }

  $addSettersFromKeys(keys: string[]) {
      keys.forEach(key => {
        // $FlowFixMe
        this[`set${capitalize(key)}`] = this.setter(key)
      })
  }

  $register(name: string) {
    return (action: Function) => 
      (reducerFunc: $Reducer<*, S>) => { 
        this.__extra.reducerObj[action.toString()] = reducerFunc
        this.$add(name)(action)
        return action 
    }
  }

  $registerConstant(name: string) {
    return (action: Function) => 
      (reducerFunc: ((state: ?S) => ?S)) => 
        this.$register(name)(action)(always(reducerFunc))
  }

  setter = (field: string) => (value: any) => 
    this.__extra.setField(field, value)

  toggle = (field: string) => (value: ?boolean) => 
    this.__extra.toggleField(field, value)

  constant = (field: string, value: any) => (_: any) => 
    this.__extra.setField(field, value)

  batch = batch
}

export function actionFactory<S: Object>(
  name: string,
  initialState: ?S, 
): ActionCreator<S> & {[action: string]: Function}
{
  const reducerObj = {}
  const reducer = createReducerFunction(reducerObj, initialState)

  return new ActionCreator(reducerObj, initialState, name, reducer)
}
