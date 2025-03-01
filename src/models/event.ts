export interface eventSchema {
  slug: string; // unique slug for the event
  name: string; // name for the event
  enabled: boolean; // if everyone can get their certificates
  type: "certificate" | "checkin"; // event type
  certificate?: {
    //certificate configuration
    //NOTE: Recommended Certificate Image Resolution: 2667 x 1886
    alignment: string; // alignment property
    x: number;
    y: number;
    maxWidth: number;
    maxHeight: number;
    url: string;
    channelId: string;
    font: {
      color: "WHITE" | "BLACK";
      size: 32 | 64 | 128 | 256;
    };
  };
  checkin?: {
    //checkin configuration
    roleId: string;
    categoryId: string[];
    teamEvent: boolean;
    channelId: string;
  };
  teamCounter: number; //Counts number of team
  ledgerChannel: string; // channel id for logging certificate collection / checkin confirmation
}

export interface eventUserSchema {
  userId: string;
  joinedDiscord?: boolean;
}

export interface registrantSchema {
  name: string;
  email: string;
  teamName?: string;
  checkedIn?: boolean;
}

export interface checkInDBSchema{
  name:string;
  discordID:string;
  email:string;
}

export interface mqSchema {
  type: "memberAddedToTeam" | "channelCreatedForTeam";
  userID: string;
  userEmail: string;
  userName: string;
  teamName: string;
}
