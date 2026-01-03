/**
 * Contact Profile Card Component
 * Displays relationship score and detailed contact information
 */

import React from 'react';
import { Badge } from './badge';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Progress } from './progress';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

export function ContactProfileCard({
  contact,
  relationshipData,
  onEmailClick,
  onViewDetails,
  compact = false,
  showActions = true
}) {
  const {
    email,
    name,
    company,
    position,
    avatar_url,
    relationship_score,
    relationship_category,
    component_scores,
    insights,
    last_analysis_date
  } = contact;

  // Get category styling
  const categoryConfig = getCategoryConfig(relationship_category);

  // Format relationship score
  const score = Math.round(relationship_score || 0);

  if (compact) {
    return (
      <CompactContactCard
        contact={contact}
        relationshipData={relationshipData}
        categoryConfig={categoryConfig}
        score={score}
        onEmailClick={onEmailClick}
      />
    );
  }

  return (
    <Card className="w-full max-w-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={avatar_url} alt={name || email} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(name || email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">
                {name || 'Unknown Contact'}
              </CardTitle>
              <CardDescription className="truncate">
                {email}
              </CardDescription>
              {(company || position) && (
                <div className="text-sm text-muted-foreground mt-1">
                  {position && <div>{position}</div>}
                  {company && <div className="text-xs">{company}</div>}
                </div>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className={`${categoryConfig.badgeClass} border-current`}
          >
            {categoryConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Relationship Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Relationship Score</span>
            <span className="text-2xl font-bold text-primary">{score}</span>
          </div>
          <Progress value={score} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0</span>
            <span className="font-medium">{categoryConfig.description}</span>
            <span>100</span>
          </div>
        </div>

        {/* Component Scores */}
        {component_scores && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Component Scores</h4>
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(component_scores).map(([component, componentScore]) => (
                <div key={component} className="flex items-center justify-between text-sm">
                  <span className="capitalize text-muted-foreground">
                    {formatComponentName(component)}
                  </span>
                  <div className="flex items-center space-x-2">
                    <Progress value={componentScore} className="w-16 h-1" />
                    <span className="text-xs font-medium w-8 text-right">
                      {Math.round(componentScore)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Key Insights */}
        {insights && insights.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Key Insights</h4>
            <div className="space-y-1">
              {insights.slice(0, 2).map((insight, index) => (
                <p key={index} className="text-xs text-muted-foreground">
                  • {insight}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Last Analysis */}
        {last_analysis_date && (
          <div className="text-xs text-muted-foreground pt-2 border-t">
            Last analyzed: {new Date(last_analysis_date).toLocaleDateString()}
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex space-x-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEmailClick && onEmailClick(email)}
              className="flex-1"
            >
              Send Email
            </Button>
            <Button
              size="sm"
              onClick={() => onViewDetails && onViewDetails(contact)}
              className="flex-1"
            >
              View Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact version of the contact card for list views
 */
function CompactContactCard({ contact, relationshipData, categoryConfig, score, onEmailClick }) {
  const { email, name, company, position } = contact;

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={contact.avatar_url} alt={name || email} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(name || email)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">
            {name || 'Unknown Contact'}
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {email}
          </div>
          {(company || position) && (
            <div className="text-xs text-muted-foreground truncate">
              {position && `${position}${company ? ', ' : ''}`}
              {company}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-3 flex-shrink-0">
        <div className="text-right">
          <div className="text-lg font-bold text-primary">{score}</div>
          <div className="text-xs text-muted-foreground">Score</div>
        </div>

        <Badge
          variant="outline"
          className={`text-xs ${categoryConfig.badgeClass}`}
        >
          {categoryConfig.shortLabel || categoryConfig.label}
        </Badge>

        <Button
          size="sm"
          variant="ghost"
          onClick={() => onEmailClick && onEmailClick(email)}
          className="h-8 w-8 p-0"
        >
          ✉️
        </Button>
      </div>
    </div>
  );
}

/**
 * Get category configuration for styling and labels
 */
function getCategoryConfig(category) {
  const configs = {
    champion: {
      label: 'Champion',
      shortLabel: '🏆',
      description: 'Top relationships',
      badgeClass: 'text-green-700 border-green-200 bg-green-50',
      bgClass: 'bg-green-50 border-green-200',
      textClass: 'text-green-700'
    },
    strong: {
      label: 'Strong',
      shortLabel: '💪',
      description: 'Active connections',
      badgeClass: 'text-blue-700 border-blue-200 bg-blue-50',
      bgClass: 'bg-blue-50 border-blue-200',
      textClass: 'text-blue-700'
    },
    warming: {
      label: 'Warming',
      shortLabel: '🌱',
      description: 'Building rapport',
      badgeClass: 'text-amber-700 border-amber-200 bg-amber-50',
      bgClass: 'bg-amber-50 border-amber-200',
      textClass: 'text-amber-700'
    },
    at_risk: {
      label: 'At Risk',
      shortLabel: '⚠️',
      description: 'Going cold',
      badgeClass: 'text-red-700 border-red-200 bg-red-50',
      bgClass: 'bg-red-50 border-red-200',
      textClass: 'text-red-700'
    },
    cold: {
      label: 'Cold',
      shortLabel: '❄️',
      description: 'Needs attention',
      badgeClass: 'text-gray-700 border-gray-200 bg-gray-50',
      bgClass: 'bg-gray-50 border-gray-200',
      textClass: 'text-gray-700'
    }
  };

  return configs[category] || configs.cold;
}

/**
 * Get initials from name or email
 */
function getInitials(text) {
  if (!text) return '??';

  // If it's an email, get the part before @
  const name = text.includes('@') ? text.split('@')[0] : text;

  return name
    .split(/[\s.-]+/)
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')
    .substring(0, 2) || '??';
}

/**
 * Format component name for display
 */
function formatComponentName(component) {
  return component
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Contact Profile Card with detailed view modal
 */
export function ContactProfileModal({ contact, relationshipData, isOpen, onClose }) {
  if (!isOpen || !contact) return null;

  const categoryConfig = getCategoryConfig(contact.relationship_category);
  const score = Math.round(contact.relationship_score || 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={contact.avatar_url} alt={contact.name || contact.email} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {getInitials(contact.name || contact.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">
                  {contact.name || 'Unknown Contact'}
                </h2>
                <p className="text-muted-foreground">{contact.email}</p>
                {(contact.company || contact.position) && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {contact.position && <div>{contact.position}</div>}
                    {contact.company && <div>{contact.company}</div>}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <Badge className={`${categoryConfig.badgeClass} mb-2`}>
                {categoryConfig.label}
              </Badge>
              <div className="text-3xl font-bold text-primary">{score}</div>
              <div className="text-sm text-muted-foreground">Relationship Score</div>
            </div>
          </div>

          {/* Detailed Component Scores */}
          {contact.component_scores && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {Object.entries(contact.component_scores).map(([component, componentScore]) => (
                <div key={component} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{formatComponentName(component)}</span>
                    <span className="text-sm font-bold">{Math.round(componentScore)}</span>
                  </div>
                  <Progress value={componentScore} className="h-2" />
                </div>
              ))}
            </div>
          )}

          {/* Insights */}
          {contact.insights && contact.insights.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Relationship Insights</h3>
              <div className="space-y-2">
                {contact.insights.map((insight, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-primary mt-1">•</span>
                    <p className="text-sm text-muted-foreground">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact Actions */}
          <div className="flex space-x-3">
            <Button onClick={() => window.open(`mailto:${contact.email}`, '_blank')}>
              Send Email
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Contact list component for displaying multiple contacts
 */
export function ContactList({
  contacts,
  relationshipData,
  onContactClick,
  onEmailClick,
  sortBy = 'score',
  filterBy = 'all'
}) {
  // Filter contacts
  let filteredContacts = contacts;

  if (filterBy !== 'all') {
    filteredContacts = contacts.filter(contact => contact.relationship_category === filterBy);
  }

  // Sort contacts
  filteredContacts.sort((a, b) => {
    switch (sortBy) {
      case 'score':
        return (b.relationship_score || 0) - (a.relationship_score || 0);
      case 'name':
        return (a.name || a.email).localeCompare(b.name || b.email);
      case 'email':
        return a.email.localeCompare(b.email);
      case 'recent':
        return new Date(b.last_analysis_date || 0) - new Date(a.last_analysis_date || 0);
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-3">
      {filteredContacts.map((contact) => (
        <div
          key={contact.email}
          onClick={() => onContactClick && onContactClick(contact)}
          className="cursor-pointer"
        >
          <ContactProfileCard
            contact={contact}
            relationshipData={relationshipData}
            onEmailClick={(email) => {
              onEmailClick && onEmailClick(email);
            }}
            compact={true}
          />
        </div>
      ))}

      {filteredContacts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No contacts found matching the current filter.
        </div>
      )}
    </div>
  );
}

/**
 * Relationship score badge component
 */
export function RelationshipScoreBadge({ score, category, size = 'default' }) {
  const categoryConfig = getCategoryConfig(category);
  const scoreValue = Math.round(score || 0);

  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    default: 'text-sm px-3 py-1',
    large: 'text-base px-4 py-2'
  };

  return (
    <Badge
      variant="outline"
      className={`${categoryConfig.badgeClass} ${sizeClasses[size]} font-semibold`}
    >
      {scoreValue} - {categoryConfig.label}
    </Badge>
  );
}

/**
 * Relationship trend indicator
 */
export function RelationshipTrendIndicator({ trend, currentScore, previousScore }) {
  if (!trend || !previousScore) {
    return (
      <div className="flex items-center space-x-1 text-muted-foreground">
        <span className="text-xs">No trend data</span>
      </div>
    );
  }

  const scoreChange = currentScore - previousScore;
  const isPositive = scoreChange > 0;
  const isNegative = scoreChange < 0;

  return (
    <div className={`flex items-center space-x-1 ${
      isPositive ? 'text-green-600' :
      isNegative ? 'text-red-600' :
      'text-muted-foreground'
    }`}>
      <span className="text-xs">
        {isPositive ? '↗' : isNegative ? '↘' : '→'}
      </span>
      <span className="text-xs font-medium">
        {isPositive ? '+' : ''}{Math.round(scoreChange)}
      </span>
      <span className="text-xs text-muted-foreground">
        {trend}
      </span>
    </div>
  );
}