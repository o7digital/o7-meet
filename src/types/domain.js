/**
 * @typedef {'admin'|'host'|'member'|'guest'} UserRole
 * @typedef {{id:string, tenantId:string, name:string, email:string, role:UserRole, permissions:string[]}} User
 * @typedef {{id:string, name:string, slug:string}} Organization
 * @typedef {'scheduled'|'live'|'completed'|'cancelled'} MeetingStatus
 * @typedef {{id:string, title:string, description:string, date:string, time:string, duration:number, participants:Array<{name:string,email?:string}>, client?:string, opportunity?:string, status:MeetingStatus, hasSummary:boolean, link:string}} Meeting
 * @typedef {{user:User|null, organization:Organization|null, accessToken?:string, expiresAt?:string}} O7Session
 */

export const USER_ROLES = ['admin', 'host', 'member', 'guest'];
