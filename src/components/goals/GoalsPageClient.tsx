// src/components/goals/GoalsPageClient.tsx
'use client'

import { useState } from 'react'
import { GoalList } from './GoalList'
import { GoalForm } from './GoalForm'
import { Button } from '@/components/ui/button'
import { PageTransition } from '@/components/ui/page-transition'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function GoalsPageClient() {
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  return (
    <PageTransition>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-sage-600">Goals</h1>
            <p className="text-warm-gray-700">Track your financial goals and progress</p>
          </div>
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-sage-600 hover:bg-sage-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Goal
          </Button>
        </div>

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active Goals</TabsTrigger>
            <TabsTrigger value="all">All Goals</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <GoalList includeCompleted={false} />
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <GoalList includeCompleted={true} />
          </TabsContent>
        </Tabs>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
            </DialogHeader>
            <GoalForm onSuccess={() => setAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  )
}
