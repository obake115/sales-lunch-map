import { DEV_UID } from '../constants';
import { firebaseAuth } from '../firebase';

/** 現在ログイン中のユーザーが開発者UIDかどうかを判定 */
export function isDevUser(): boolean {
  return firebaseAuth.currentUser?.uid === DEV_UID;
}
