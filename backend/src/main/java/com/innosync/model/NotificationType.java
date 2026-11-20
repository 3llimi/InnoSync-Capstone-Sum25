package com.innosync.model;

/** What happened. The frontend picks the icon and colour from this. */
public enum NotificationType {
    INVITATION_RECEIVED,   // a recruiter invited you to a role
    INVITATION_ACCEPTED,   // someone accepted your invitation
    INVITATION_DECLINED,   // someone declined your invitation
    APPLICATION_RECEIVED,  // someone applied to one of your roles
    APPLICATION_ACCEPTED,  // your application was accepted
    APPLICATION_REJECTED,  // your application was rejected
    PROJECT_DELETED        // a project you were part of was deleted
}
